import { Router } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../db';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const userId = 1; // temporary until authentication is added
    const [rows] = await pool.query(
      `SELECT id, company, position, status, applied_date, notes
       FROM applications
       WHERE user_id = ?
       ORDER BY applied_date DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load applications' });
  }
});

const VALID_STATUSES = ['applied', 'interviewing', 'offer', 'rejected'];

router.post('/', async (req, res) => {
  const { company, position, status = 'applied', applied_date, notes } = req.body;

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
    const userId = 1; // temporary until authentication is added

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO applications (user_id, company, position, status, applied_date, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, company.trim(), position.trim(), status, applied_date || null, notes || null]
    );

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, company, position, status, applied_date, notes
       FROM applications
       WHERE id = ? AND user_id = ?`,
      [result.insertId, userId]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create application' });
  }
});

export default router;