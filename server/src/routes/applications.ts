import { Router } from 'express';
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

export default router;