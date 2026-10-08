import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import type { PoolConnection } from 'mysql2/promise';
import 'dotenv/config';

// On AWS, connect over TLS and verify the server is really our RDS database
const ssl =
  process.env.DB_SSL === 'true'
    ? {
        ca: fs.readFileSync(path.join(process.cwd(), 'global-bundle.pem')),
        rejectUnauthorized: true,
      }
    : undefined;

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT ?? 10),
  dateStrings: true,
  ssl,
});

// Runs several queries as one all-or-nothing unit
export async function withTransaction<T>(
  work: (conn: PoolConnection) => Promise<T>
): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}