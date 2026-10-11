import { PoolConnection } from 'mysql2/promise';
import { pool } from '../../database/pool';
import { AppError } from '../../utils/errors';

/**
 * Deduct stock for a set of order items within a transaction.
 * Throws if any product would go negative (concurrent-safe via row lock).
 */
export async function deductStockForOrder(
  conn: PoolConnection,
  storeId: number,
  items: Array<{ product_id: number; quantity: number }>
): Promise<void> {
  // Sort by product_id to avoid deadlocks across concurrent transactions
  const sorted = [...items].sort((a, b) => a.product_id - b.product_id);

  for (const item of sorted) {
    const [rows]: any = await conn.query(
      `SELECT id, stock_quantity
       FROM products
       WHERE id = ? AND store_id = ?
       FOR UPDATE`,
      [item.product_id, storeId]
    );

    if (!rows.length) {
      throw new AppError(400, `Product ${item.product_id} not found in this store`);
    }

    const product = rows[0];
    if (product.stock_quantity < item.quantity) {
      throw new AppError(
        400,
        `Insufficient stock for product ${item.product_id} (available: ${product.stock_quantity}, requested: ${item.quantity})`
      );
    }

    await conn.query(
      'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
      [item.quantity, item.product_id]
    );

    // Record movement
    await conn.query(
      `INSERT INTO inventory_movements
        (store_id, product_id, change_qty, reason, reference_type, reference_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        storeId,
        item.product_id,
        -item.quantity,
        'ORDER_DEDUCTION',
        'ORDER',
        null,
      ]
    );
  }
}

/**
 * Restore stock when an order is cancelled.
 */
export async function restoreStockForOrder(
  conn: PoolConnection,
  storeId: number,
  items: Array<{ product_id: number; quantity: number }>,
  orderId: number
): Promise<void> {
  const sorted = [...items].sort((a, b) => a.product_id - b.product_id);

  for (const item of sorted) {
    await conn.query(
      'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ? AND store_id = ?',
      [item.quantity, item.product_id, storeId]
    );

    await conn.query(
      `INSERT INTO inventory_movements
        (store_id, product_id, change_qty, reason, reference_type, reference_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        storeId,
        item.product_id,
        item.quantity,
        'ORDER_CANCELLED',
        'ORDER',
        orderId,
      ]
    );
  }
}

/**
 * List inventory movements for a store.
 */
export async function listInventoryMovements(storeId: number, limit = 100) {
  const [rows]: any = await pool.query(
    `SELECT im.id, im.product_id, p.name AS product_name, im.change_qty,
            im.reason, im.reference_type, im.reference_id, im.created_at
     FROM inventory_movements im
     LEFT JOIN products p ON p.id = im.product_id
     WHERE im.store_id = ?
     ORDER BY im.id DESC
     LIMIT ?`,
    [storeId, limit]
  );
  return rows;
}