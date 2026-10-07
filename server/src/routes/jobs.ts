import { Router } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../db';
import { findApplication } from './applications';

const router = Router();

function parseId(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// LIST job postings, newest first
router.get('/', async (req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, title, company, location, work_mode, employment_type,
            salary_min, salary_max, description, skills, posted_date
     FROM job_postings
     ORDER BY posted_date DESC, id DESC`
  );
  res.json(rows.map(row => ({ ...row, skills: row.skills ?? [] })));
});

// APPLY: record an application to this posting
router.post('/:id/apply', async (req, res) => {
  const jobId = parseId(req.params.id);
  const userId = req.userId!;

  const [jobs] = await pool.query<RowDataPacket[]>(
    'SELECT id, title, company FROM job_postings WHERE id = ?',
    [jobId]
  );
  const job = jobs[0];
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  // Use the user's default résumé, if they have one
  const [defaults] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM resumes WHERE user_id = ? AND is_default = TRUE',
    [userId]
  );

  try {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO applications
         (user_id, company, position, status, applied_date, resume_id, job_posting_id)
       VALUES (?, ?, ?, 'applied', CURDATE(), ?, ?)`,
      [userId, job.company, job.title, defaults[0]?.id ?? null, job.id]
    );

    res.status(201).json(await findApplication(result.insertId, userId));
  } catch (err: any) {
    if (err?.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: "You've already applied to this job" });
      return;
    }
    throw err;
  }
});

export default router;