import { Router } from 'express';
import crypto from 'crypto';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool, withTransaction } from '../db';
import { createUploadUrl, createDownloadUrl, getFileInfo, deleteFile } from '../storage/s3';
import { MAX_FILE_BYTES, ALLOWED_TYPES, isAllowedType, cleanFileName } from '../storage/file-rules';

const router = Router();

const MAX_RESUMES = 3;
const MAX_NICKNAME_LENGTH = 50;

const RESUME_COLUMNS =
  "id, nickname, file_name, content_type, size_bytes, is_default, " +
  "DATE_FORMAT(uploaded_at, '%Y-%m-%dT%H:%i:%s') AS uploaded_at";

// An error with an HTTP status, thrown from inside transactions
class RequestError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// MySQL stores booleans as 0/1, so convert for the API
function toResume(row: RowDataPacket) {
  return { ...row, is_default: Boolean(row.is_default) };
}

function parseId(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function validNickname(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_NICKNAME_LENGTH ? trimmed : null;
}

// LIST
router.get('/', async (req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ${RESUME_COLUMNS} FROM resumes WHERE user_id = ? ORDER BY is_default DESC, uploaded_at DESC`,
    [req.userId]
  );
  res.json(rows.map(toResume));
});

// UPLOAD step 1: check the limit and nickname, then hand out an upload link
router.post('/upload-url', async (req, res) => {
  const { fileName, contentType, size, nickname } = req.body ?? {};
  const cleanNickname = validNickname(nickname);

  if (!cleanNickname) {
    res.status(400).json({ error: `Nickname is required (up to ${MAX_NICKNAME_LENGTH} characters)` });
    return;
  }
  if (typeof fileName !== 'string' || fileName.trim() === '') {
    res.status(400).json({ error: 'File name is required' });
    return;
  }
  if (!isAllowedType(contentType)) {
    res.status(400).json({ error: 'Only PDF, Word, or text files are allowed' });
    return;
  }
  if (typeof size !== 'number' || size <= 0 || size > MAX_FILE_BYTES) {
    res.status(400).json({ error: 'Files must be 5 MB or smaller' });
    return;
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS count, SUM(nickname = ?) AS taken FROM resumes WHERE user_id = ?',
    [cleanNickname, req.userId]
  );
  if (rows[0].count >= MAX_RESUMES) {
    res.status(400).json({ error: `You can save up to ${MAX_RESUMES} résumés. Delete one to add another.` });
    return;
  }
  if (Number(rows[0].taken) > 0) {
    res.status(409).json({ error: 'You already have a résumé with that nickname' });
    return;
  }

  const key = `users/${req.userId}/resumes/${crypto.randomUUID()}${ALLOWED_TYPES[contentType]}`;
  const uploadUrl = await createUploadUrl(key, contentType);
  res.json({ uploadUrl, key });
});

// UPLOAD step 2: verify the file and save the record
router.post('/', async (req, res) => {
  const { key, fileName, nickname } = req.body ?? {};
  const cleanNickname = validNickname(nickname);
  const expectedPrefix = `users/${req.userId}/resumes/`;

  if (typeof key !== 'string' || !key.startsWith(expectedPrefix) || key.includes('..')) {
    res.status(400).json({ error: 'Invalid upload' });
    return;
  }
  if (!cleanNickname || typeof fileName !== 'string' || fileName.trim() === '') {
    res.status(400).json({ error: 'Nickname and file name are required' });
    return;
  }

  const info = await getFileInfo(key);
  if (!info) {
    res.status(400).json({ error: 'Upload not found. Please try again.' });
    return;
  }
  if (info.size > MAX_FILE_BYTES || !isAllowedType(info.contentType)) {
    await deleteFile(key);
    res.status(400).json({ error: 'That file was rejected. Only PDF, Word, or text files up to 5 MB.' });
    return;
  }

  try {
    const resume = await withTransaction(async conn => {
      // Lock this user's row, so two uploads at the same moment can't both slip under the limit
      await conn.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [req.userId]);

      const [counts] = await conn.query<RowDataPacket[]>(
        'SELECT COUNT(*) AS count FROM resumes WHERE user_id = ?',
        [req.userId]
      );
      const count = counts[0].count;
      if (count >= MAX_RESUMES) {
        throw new RequestError(400, `You can save up to ${MAX_RESUMES} résumés. Delete one to add another.`);
      }

      const [result] = await conn.query<ResultSetHeader>(
        `INSERT INTO resumes (user_id, nickname, file_name, content_type, size_bytes, s3_key, is_default)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [req.userId, cleanNickname, cleanFileName(fileName), info.contentType, info.size, key, count === 0]
      );

      const [rows] = await conn.query<RowDataPacket[]>(
        `SELECT ${RESUME_COLUMNS} FROM resumes WHERE id = ?`,
        [result.insertId]
      );
      return toResume(rows[0]);
    });

    res.status(201).json(resume);
  } catch (err: any) {
    const alreadySaved = err?.code === 'ER_DUP_ENTRY' && String(err.sqlMessage).includes('s3_key');

    // The upload was rejected, so don't leave the file behind in S3
    // (unless it was simply saved already, in which case it's in use)
    if (!alreadySaved) {
      try {
        await deleteFile(key);
      } catch (cleanupErr) {
        console.error('Failed to clean up rejected upload', cleanupErr);
      }
    }

    if (err instanceof RequestError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    if (alreadySaved) {
      res.status(409).json({ error: 'This upload was already saved' });
      return;
    }
    if (err?.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'You already have a résumé with that nickname' });
      return;
    }
    throw err;
  }
});

// RENAME and/or MAKE DEFAULT
router.patch('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: 'Invalid résumé id' });
    return;
  }

  const { nickname, is_default } = req.body ?? {};
  let cleanNickname: string | null = null;

  if (nickname !== undefined) {
    cleanNickname = validNickname(nickname);
    if (!cleanNickname) {
      res.status(400).json({ error: `Nickname is required (up to ${MAX_NICKNAME_LENGTH} characters)` });
      return;
    }
  }
  if (is_default !== undefined && is_default !== true) {
    res.status(400).json({ error: 'To change the default, make another résumé the default' });
    return;
  }
  if (nickname === undefined && is_default === undefined) {
    res.status(400).json({ error: 'Nothing to update' });
    return;
  }

  try {
    const resume = await withTransaction(async conn => {
      const [found] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM resumes WHERE id = ? AND user_id = ? FOR UPDATE',
        [id, req.userId]
      );
      if (!found[0]) {
        throw new RequestError(404, 'Résumé not found');
      }

      if (cleanNickname) {
        await conn.query('UPDATE resumes SET nickname = ? WHERE id = ?', [cleanNickname, id]);
      }
      if (is_default === true) {
        // Sets this one to TRUE and every other résumé of this user to FALSE, in one statement
        await conn.query('UPDATE resumes SET is_default = (id = ?) WHERE user_id = ?', [id, req.userId]);
      }

      const [rows] = await conn.query<RowDataPacket[]>(
        `SELECT ${RESUME_COLUMNS} FROM resumes WHERE id = ?`,
        [id]
      );
      return toResume(rows[0]);
    });

    res.json(resume);
  } catch (err: any) {
    if (err instanceof RequestError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    if (err?.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'You already have a résumé with that nickname' });
      return;
    }
    throw err;
  }
});

// DOWNLOAD
router.get('/:id/download-url', async (req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT s3_key, file_name FROM resumes WHERE id = ? AND user_id = ?',
    [parseId(req.params.id), req.userId]
  );
  if (!rows[0]) {
    res.status(404).json({ error: 'Résumé not found' });
    return;
  }

  const url = await createDownloadUrl(rows[0].s3_key, cleanFileName(rows[0].file_name));
  res.json({ url });
});

// DELETE (if it was the default, the newest remaining résumé becomes the default)
router.delete('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, s3_key, is_default FROM resumes WHERE id = ? AND user_id = ?',
    [id, req.userId]
  );
  const resume = rows[0];
  if (!resume) {
    res.status(404).json({ error: 'Résumé not found' });
    return;
  }

  await deleteFile(resume.s3_key);

  await withTransaction(async conn => {
    await conn.query('DELETE FROM resumes WHERE id = ?', [resume.id]);
    if (resume.is_default) {
      await conn.query(
        `UPDATE resumes SET is_default = TRUE
         WHERE user_id = ?
         ORDER BY uploaded_at DESC, id DESC
         LIMIT 1`,
        [req.userId]
      );
    }
  });

  res.status(204).send();
});

export default router;