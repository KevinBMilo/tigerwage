import type { Request, Response, NextFunction } from 'express';
import type { RowDataPacket } from 'mysql2';
import { pool } from '../db';

// Runs after requireAuth: allows the request only if this user is an admin
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT is_admin FROM users WHERE id = ?',
    [req.userId]
  );

  if (!rows[0]?.is_admin) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
}