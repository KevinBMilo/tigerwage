import { Router } from 'express';
import type { RowDataPacket } from 'mysql2';
import { pool } from '../db';

const router = Router();

// LIST all users, newest first
router.get('/users', async (req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT
      u.id,
      u.email,
      u.first_name,
      u.last_name,
      u.is_admin,
      DATE_FORMAT(u.created_at, '%Y-%m-%dT%H:%i:%s') AS created_at,
      DATE_FORMAT(u.email_verified_at, '%Y-%m-%dT%H:%i:%s') AS email_verified_at,
      (SELECT COUNT(*) FROM applications a WHERE a.user_id = u.id) AS application_count
    FROM users u
    ORDER BY u.created_at DESC
  `);

  res.json(
    rows.map(row => ({
      ...row,
      is_admin: Boolean(row.is_admin),
      application_count: Number(row.application_count),
    }))
  );
});

export default router;