import { Router } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../db';
import { deleteFile } from '../storage/s3';

const router = Router();

async function findApplication(id: number, userId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `${APPLICATION_SELECT} WHERE a.id = ? AND a.user_id = ?`,
    [id, userId]
  );
  return rows[0] ?? null;
}

router.get('/', async (req, res) => {
  try {
    const userId = req.userId!;
    const [rows] = await pool.query<RowDataPacket[]>(
      `${APPLICATION_SELECT} WHERE a.user_id = ? ORDER BY a.applied_date DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load applications' });
  }
});

const VALID_STATUSES = ['applied', 'interviewing', 'offer', 'rejected'];

const APPLICATION_SELECT = `
  SELECT a.id, a.company, a.position, a.status, a.applied_date, a.interview_date,
         a.follow_up_date, a.notes, a.resume_id, r.nickname AS resume_nickname
  FROM applications a
  LEFT JOIN resumes r ON r.id = a.resume_id`;

function isDateOrEmpty(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value))
  );
}

// Returns the résumé ID to save (or null for none), or false if it isn't one of the user's
async function checkResumeId(value: unknown, userId: number): Promise<number | null | false> {
  if (value === null || value === '') {
    return null;
  }
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    return false;
  }
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM resumes WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  return rows[0] ? id : false;
}

router.post('/', async (req, res) => {

  const {
    company,
    position,
    status = 'applied',
    applied_date,
    interview_date,
    follow_up_date,
    notes,
    resume_id,
  } = req.body ?? {};

  if (![applied_date, interview_date, follow_up_date].every(isDateOrEmpty)) {
    return res.status(400).json({ error: 'Dates must be in YYYY-MM-DD format' });
  }

  // Validate input
  if (typeof company !== 'string' || company.trim() === '') {
    return res.status(400).json({ error: 'Company is required' });
  }
  if (typeof position !== 'string' || position.trim() === '') {
    return res.status(400).json({ error: 'Position is required' });
  }
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const userId = req.userId!;

    let resumeId: number | null = null;
    if (resume_id !== undefined) {
      const checked = await checkResumeId(resume_id, userId);
      if (checked === false) {
        return res.status(400).json({ error: 'Choose one of your saved résumés' });
      }
      resumeId = checked;
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO applications
        (user_id, company, position, status, applied_date, interview_date, follow_up_date, notes, resume_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        company.trim(),
        position.trim(),
        status,
        applied_date || null,
        interview_date || null,
        follow_up_date || null,
        notes || null,
        resumeId,
      ]
    );

    const created = await findApplication(result.insertId, userId);
    res.status(201).json(created);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create application' });
  }
});

// UPDATE: change one or more fields of an application
router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid application id' });
  }

  const { company, position, status, applied_date, interview_date, follow_up_date, notes, resume_id } = req.body ?? {};

  if (![applied_date, interview_date, follow_up_date].every(isDateOrEmpty)) {
    return res.status(400).json({ error: 'Dates must be in YYYY-MM-DD format' });
  }

  // Validate only the fields that were sent
  if (company !== undefined && (typeof company !== 'string' || company.trim() === '')) {
    return res.status(400).json({ error: 'Company cannot be empty' });
  }
  if (position !== undefined && (typeof position !== 'string' || position.trim() === '')) {
    return res.status(400).json({ error: 'Position cannot be empty' });
  }
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  // Build the list of changes from a fixed set of allowed columns
  const updates: Record<string, unknown> = {};
  if (company !== undefined) updates.company = company.trim();
  if (position !== undefined) updates.position = position.trim();
  if (status !== undefined) updates.status = status;
  if (applied_date !== undefined) updates.applied_date = applied_date || null;
  if (notes !== undefined) updates.notes = notes || null;
  if (interview_date !== undefined) {
    updates.interview_date = interview_date || null;
    updates.interview_reminder_sent_at = null;
  }
  if (follow_up_date !== undefined) {
    updates.follow_up_date = follow_up_date || null;
    updates.follow_up_reminder_sent_at = null;
  }


  const fields = Object.keys(updates);
  if (fields.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  try {
    const userId = req.userId!;
    const setClause = fields.map(field => `${field} = ?`).join(', ');

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE applications SET ${setClause} WHERE id = ? AND user_id = ?`,
      [...Object.values(updates), id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json(await findApplication(id, userId));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update application' });
  }
});


// DELETE: remove an application
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid application id' });
  }

  try {
    const userId = req.userId!;
    const [docs] = await pool.query<RowDataPacket[]>(
      `SELECT d.s3_key
      FROM documents d
      JOIN applications a ON a.id = d.application_id
      WHERE a.id = ? AND a.user_id = ?`,
      [id, userId]
    );
    await Promise.all(docs.map(doc => deleteFile(doc.s3_key)));
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM applications WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete application' });
  }
});

export default router;