import { Router } from 'express';
import crypto from 'crypto';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../db';
import { createUploadUrl, createDownloadUrl, getFileInfo, deleteFile } from '../storage/s3';

// mergeParams lets this router read :applicationId from the path it's mounted on
const router = Router({ mergeParams: true });

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/plain': '.txt',
};

const DOCUMENT_COLUMNS =
  "id, file_name, content_type, size_bytes, DATE_FORMAT(uploaded_at, '%Y-%m-%dT%H:%i:%s') AS uploaded_at";

function parseId(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function isAllowedType(type: unknown): type is string {
  return typeof type === 'string' && Object.hasOwn(ALLOWED_TYPES, type);
}

// Keeps file names safe for download headers
function cleanFileName(name: string): string {
  const cleaned = name.replace(/[^\w.\- ()]/g, '_').trim().slice(0, 200);
  return cleaned || 'document';
}

// Runs before every route below: the application must exist AND belong to this user
router.use(async (req, res, next) => {
  const applicationId = parseId((req.params as Record<string, string>).applicationId);
  if (!applicationId) {
    res.status(400).json({ error: 'Invalid application id' });
    return;
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM applications WHERE id = ? AND user_id = ?',
    [applicationId, req.userId]
  );
  if (!rows[0]) {
    res.status(404).json({ error: 'Application not found' });
    return;
  }

  res.locals.applicationId = applicationId;
  next();
});

// LIST documents for an application
router.get('/', async (req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ${DOCUMENT_COLUMNS} FROM documents WHERE application_id = ? ORDER BY uploaded_at DESC`,
    [res.locals.applicationId]
  );
  res.json(rows);
});

// STEP 1 of an upload: get a presigned upload link
router.post('/upload-url', async (req, res) => {
  const { fileName, contentType, size } = req.body ?? {};

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

  const key =
    `users/${req.userId}/applications/${res.locals.applicationId}/` +
    `${crypto.randomUUID()}${ALLOWED_TYPES[contentType]}`;

  const uploadUrl = await createUploadUrl(key, contentType);
  res.json({ uploadUrl, key });
});

// STEP 2 of an upload: confirm it and record it
router.post('/', async (req, res) => {
  const { key, fileName } = req.body ?? {};
  const expectedPrefix = `users/${req.userId}/applications/${res.locals.applicationId}/`;

  if (typeof key !== 'string' || !key.startsWith(expectedPrefix) || key.includes('..')) {
    res.status(400).json({ error: 'Invalid upload' });
    return;
  }
  if (typeof fileName !== 'string' || fileName.trim() === '') {
    res.status(400).json({ error: 'File name is required' });
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
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO documents (application_id, file_name, content_type, size_bytes, s3_key)
       VALUES (?, ?, ?, ?, ?)`,
      [res.locals.applicationId, cleanFileName(fileName), info.contentType, info.size, key]
    );

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT ${DOCUMENT_COLUMNS} FROM documents WHERE id = ?`,
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (err: any) {
    if (err?.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'This upload was already saved' });
      return;
    }
    throw err;
  }
});

// DOWNLOAD: get a short-lived download link
router.get('/:documentId/download-url', async (req, res) => {
  const documentId = parseId(req.params.documentId);
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT s3_key, file_name FROM documents WHERE id = ? AND application_id = ?',
    [documentId, res.locals.applicationId]
  );
  if (!rows[0]) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }

  const url = await createDownloadUrl(rows[0].s3_key, cleanFileName(rows[0].file_name));
  res.json({ url });
});

// DELETE a document (from S3 and the database)
router.delete('/:documentId', async (req, res) => {
  const documentId = parseId(req.params.documentId);
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, s3_key FROM documents WHERE id = ? AND application_id = ?',
    [documentId, res.locals.applicationId]
  );
  if (!rows[0]) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }

  await deleteFile(rows[0].s3_key);
  await pool.query('DELETE FROM documents WHERE id = ?', [rows[0].id]);
  res.status(204).send();
});

export default router;