import { Router } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../db';

const router = Router();

async function findApplication(id: number, userId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, company, position, status, applied_date, notes
     FROM applications
     WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
  return rows[0] ?? null;
}

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

  const { company, position, status, applied_date, notes } = req.body ?? {};

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

  const fields = Object.keys(updates);
  if (fields.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  try {
    const userId = 1; // temporary until authentication is added
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
    const userId = 1; // temporary until authentication is added
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