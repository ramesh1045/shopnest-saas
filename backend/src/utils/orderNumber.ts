import { pool } from '../database/pool';

/**
 * Generates a human-readable, unique order number.
 * Format: ORD-YYYYMMDD-XXXXX where XXXXX is a padded sequence per day.
 */
export async function generateOrderNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const datePart = `${year}${month}${day}`;

  const [rows]: any = await pool.query(
    `SELECT COUNT(*) AS cnt FROM orders WHERE order_number LIKE ?`,
    [`ORD-${datePart}-%`]
  );
  const nextSeq = Number(rows[0].cnt) + 1;
  const seq = String(nextSeq).padStart(5, '0');

  return `ORD-${datePart}-${seq}`;
}