import { Router, type Response } from 'express';
import bcrypt from 'bcryptjs';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../db';
import {
  createAccessToken,
  createRefreshToken,
  hashToken,
  REFRESH_TOKEN_DAYS,
} from '../auth/tokens';
import { requireAuth } from '../middleware/require-auth';

const router = Router();

const REFRESH_COOKIE = 'refresh_token';
const REFRESH_MS = REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000;
const COOKIE_PATH = '/api/auth';

function isBot(body: any): boolean {
    return typeof body?.hp_field === 'string' && body.hp_field.trim() !== '';
}

// Creates a refresh token (saved as a hash + sent as a cookie) and returns a new access token
async function issueTokens(res: Response, userId: number): Promise<string> {
  const refreshToken = createRefreshToken();

  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [userId, hashToken(refreshToken), new Date(Date.now() + REFRESH_MS)]
  );

  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: COOKIE_PATH,
    maxAge: REFRESH_MS,
  });

  return createAccessToken(userId);
}

// SIGN UP
router.post('/register', async (req, res) => {

    if (isBot(req.body)) {
        console.warn('Honeypot triggered on register from', req.ip);
        res.status(400).json({ error: 'Unable to create account' });
        return;
    }
    
    const { email, password } = req.body ?? {};

    if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email.trim())) {
        res.status(400).json({ error: 'A valid email is required' });
        return;
    }
    if (typeof password !== 'string' || password.length < 8) {
        res.status(400).json({ error: 'Password must be at least 8 characters' });
        return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
        const passwordHash = await bcrypt.hash(password, 12);
        const [result] = await pool.query<ResultSetHeader>(
        'INSERT INTO users (email, password_hash) VALUES (?, ?)',
        [normalizedEmail, passwordHash]
        );

    const accessToken = await issueTokens(res, result.insertId);
    res.status(201).json({
      accessToken,
      user: { id: result.insertId, email: normalizedEmail },
    });
  } catch (err: any) {
    if (err?.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'An account with that email already exists' });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// LOG IN
router.post('/login', async (req, res) => {

    if (isBot(req.body)) {
        console.warn('Honeypot triggered on login from', req.ip);
        res.status(401).json({ error: 'Invalid email or password' });
        return;
    }
    
    const { email, password } = req.body ?? {};

  if (typeof email !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, email, password_hash FROM users WHERE email = ?',
      [email.trim().toLowerCase()]
    );
    const user = rows[0];
    const passwordMatches = user ? await bcrypt.compare(password, user.password_hash) : false;

    if (!user || !passwordMatches) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const accessToken = await issueTokens(res, user.id);
    res.json({ accessToken, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

// REFRESH: trade a valid refresh token for a new access token (and a new refresh token)
router.post('/refresh', async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];

  if (!token) {
    res.status(401).json({ error: 'No session' });
    return;
  }

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT rt.id, rt.user_id, u.email
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = ? AND rt.revoked_at IS NULL AND rt.expires_at > NOW()`,
      [hashToken(token)]
    );
    const record = rows[0];

    if (!record) {
      res.clearCookie(REFRESH_COOKIE, { path: COOKIE_PATH });
      res.status(401).json({ error: 'Session expired' });
      return;
    }

    // Rotate: revoke the old refresh token before issuing a new one
    await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ?', [record.id]);

    const accessToken = await issueTokens(res, record.user_id);
    res.json({ accessToken, user: { id: record.user_id, email: record.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to refresh session' });
  }
});

// LOG OUT
router.post('/logout', async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];

  try {
    if (token) {
      await pool.query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ?',
        [hashToken(token)]
      );
    }
  } catch (err) {
    console.error(err);
  }

  res.clearCookie(REFRESH_COOKIE, { path: COOKIE_PATH });
  res.status(204).send();
});

// SESSION CHECK: who am I?
router.get('/me', requireAuth, async (req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, email FROM users WHERE id = ?',
    [req.userId]
  );

  if (!rows[0]) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json(rows[0]);
});

export default router;