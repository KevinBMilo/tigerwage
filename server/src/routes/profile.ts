import { Router } from "express";
import { RowDataPacket } from "mysql2";
import { pool } from "../db";


const router = Router();

const PROFILE_COLUMNS =
  "email, first_name, last_name, phone, location, linkedin_url, portfolio_url, " +
  "DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s') AS member_since";

// The only fields users can edit, with their maximum lengths
const EDITABLE_FIELDS: Record<string, { label: string; maxLength: number }> = {
  first_name: { label: 'First name', maxLength: 100 },
  last_name: { label: 'Last name', maxLength: 100 },
  phone: { label: 'Phone', maxLength: 30 },
  location: { label: 'Location', maxLength: 150 },
  linkedin_url: { label: 'LinkedIn link', maxLength: 500 },
  portfolio_url: { label: 'Portfolio link', maxLength: 500 },
};

const URL_FIELDS = ['linkedin_url', 'portfolio_url'];

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

async function getProfile(userId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ${PROFILE_COLUMNS} FROM users WHERE id = ?`,
    [userId]
  );
  return rows[0] ?? null;
}

// VIEW profile
router.get('/', async (req, res) => {
  const profile = await getProfile(req.userId!);
  if (!profile) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(profile);
});

// UPDATE profile details
router.patch('/', async (req, res) => {
  const body = req.body ?? {};
  const updates: Record<string, string | null> = {};

  for (const [field, { label, maxLength }] of Object.entries(EDITABLE_FIELDS)) {
    const value = body[field];
    if (value === undefined) {
      continue;
    }
    if (value !== null && typeof value !== 'string') {
      res.status(400).json({ error: `${label} must be text` });
      return;
    }

    const trimmed = (value ?? '').trim();
    if (trimmed.length > maxLength) {
      res.status(400).json({ error: `${label} must be ${maxLength} characters or fewer` });
      return;
    }
    if (trimmed && URL_FIELDS.includes(field) && !isHttpUrl(trimmed)) {
      res.status(400).json({ error: `${label} must start with http:// or https://` });
      return;
    }
    if (trimmed && field === 'phone' && !/^[0-9+()\-.\s]{7,30}$/.test(trimmed)) {
      res.status(400).json({ error: 'Phone can only contain numbers, spaces, and + ( ) - .' });
      return;
    }

    updates[field] = trimmed || null;
  }

  const fields = Object.keys(updates);
  if (fields.length === 0) {
    res.status(400).json({ error: 'No valid fields to update' });
    return;
  }

  await pool.query(
    `UPDATE users SET ${fields.map(f => `${f} = ?`).join(', ')} WHERE id = ?`,
    [...Object.values(updates), req.userId]
  );

  res.json(await getProfile(req.userId!));
});

export default router;