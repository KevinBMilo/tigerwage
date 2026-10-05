import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const ACCESS_TOKEN_TTL = '15m';
export const REFRESH_TOKEN_DAYS = 7;

function getAccessSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET is not set');
  }
  return secret;
}

export function createAccessToken(userId: number): string {
  return jwt.sign({ sub: String(userId) }, getAccessSecret(), {
    expiresIn: ACCESS_TOKEN_TTL,
  });
}

export function verifyAccessToken(token: string): number {
  const payload = jwt.verify(token, getAccessSecret());
  if (typeof payload === 'string' || !payload.sub) {
    throw new Error('Invalid token');
  }
  return Number(payload.sub);
}

export function createRefreshToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}