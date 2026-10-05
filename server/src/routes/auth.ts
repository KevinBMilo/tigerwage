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
import { emailLimiter, loginLimiter } from '../middleware/rate-limit';
import { consumeEmailToken, createEmailToken } from '../auth/email-tokens';
import { sendEmail } from '../email/send-email';
import { verificationEmail } from '../email/templates';

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

async function sendVerificationEmail(userId: number, email: string): Promise<void> {
  const token = await createEmailToken(userId, 'verify_email', 24 * 60);
  const link = `${process.env.APP_URL}/verify-email?token=${token}`;
  await sendEmail(verificationEmail(email, link));
}

// SIGN UP
router.post('/register', loginLimiter, async (req, res) => {

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

        try {
            await sendVerificationEmail(result.insertId, normalizedEmail);
        } catch (emailErr) {
            // The account exists; the user can request a new link from the login page
            console.error('Failed to send verification email', emailErr);
        }
        
        res.status(201).json({
            message: 'Account created. Check your email for a link to confirm your address.',
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
router.post('/login', loginLimiter, async (req, res) => {

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
        'SELECT id, email, password_hash, email_verified_at FROM users WHERE email = ?',
        [email.trim().toLowerCase()]
    );
    const user = rows[0];
    const passwordMatches = user ? await bcrypt.compare(password, user.password_hash) : false;

    if (!user || !passwordMatches) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
    }

    if (!user.email_verified_at) {
    res.status(403).json({
        error: 'Please confirm your email address before logging in.',
        code: 'EMAIL_NOT_VERIFIED',
    });
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

// CONFIRM EMAIL: the link from the email lands here (via the Angular page)
router.post('/verify-email', async (req, res) => {
  const { token } = req.body ?? {};

  if (typeof token !== 'string' || token === '') {
    res.status(400).json({ error: 'Missing confirmation token' });
    return;
  }

  try {
    const userId = await consumeEmailToken(token, 'verify_email');
    if (!userId) {
      res.status(400).json({ error: 'This link is invalid or has expired.' });
      return;
    }

    await pool.query(
      'UPDATE users SET email_verified_at = NOW() WHERE id = ? AND email_verified_at IS NULL',
      [userId]
    );

    const [rows] = await pool.query<RowDataPacket[]>('SELECT id, email FROM users WHERE id = ?', [userId]);
    const accessToken = await issueTokens(res, userId);
    res.json({ accessToken, user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to confirm email' });
  }
});

// RESEND the confirmation email
router.post('/resend-verification', emailLimiter, async (req, res) => {
  const { email } = req.body ?? {};

  if (typeof email === 'string') {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT id, email FROM users WHERE email = ? AND email_verified_at IS NULL',
        [email.trim().toLowerCase()]
      );
      if (rows[0]) {
        await sendVerificationEmail(rows[0].id, rows[0].email);
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Same answer whether or not the account exists, so this can't be used to discover accounts
  res.json({ message: "If that account still needs confirming, we've sent a new link." });
});

export default router;