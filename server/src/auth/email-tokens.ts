import crypto from 'crypto';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../db';
import { hashToken } from './tokens';

export type EmailTokenPurpose = 'verify_email' | 'reset_password';

// Creates a one-time token, stores its hash, and returns the raw token for the email link
export async function createEmailToken(
  userId: number,
  purpose: EmailTokenPurpose,
  ttlMinutes: number
): Promise<string> {
  // Older unused links for the same purpose stop working
  await pool.query(
    'UPDATE email_tokens SET used_at = NOW() WHERE user_id = ? AND purpose = ? AND used_at IS NULL',
    [userId, purpose]
  );

  const token = crypto.randomBytes(32).toString('hex');
  await pool.query(
    'INSERT INTO email_tokens (user_id, purpose, token_hash, expires_at) VALUES (?, ?, ?, ?)',
    [userId, purpose, hashToken(token), new Date(Date.now() + ttlMinutes * 60 * 1000)]
  );

  return token;
}

// Uses up a token and returns its user ID, or null if it's invalid, expired, or already used
export async function consumeEmailToken(
  token: string,
  purpose: EmailTokenPurpose
): Promise<number | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, user_id FROM email_tokens
     WHERE token_hash = ? AND purpose = ? AND used_at IS NULL AND expires_at > NOW()`,
    [hashToken(token), purpose]
  );
  const record = rows[0];
  if (!record) {
    return null;
  }

  const [result] = await pool.query<ResultSetHeader>(
    'UPDATE email_tokens SET used_at = NOW() WHERE id = ? AND used_at IS NULL',
    [record.id]
  );

  // If another request used it a moment earlier, this one fails
  return result.affectedRows === 1 ? record.user_id : null;
}