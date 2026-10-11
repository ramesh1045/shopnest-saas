import mysql from 'mysql2/promise';
import { env } from '../config/env';

export const pool = mysql.createPool({
  host: env.DB.host,
  port: env.DB.port,
  user: env.DB.user,
  password: env.DB.password,
  database: env.DB.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+05:30',
  decimalNumbers: true,
});

export async function testConnection(): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
    console.log('[DB] MySQL connected to', env.DB.database);
  } finally {
    conn.release();
  }
}