import { pool } from '../../database/pool';
import { AppError } from '../../utils/errors';

/**
 * Merchant: list customers for a store with order stats.
 */
export async function listStoreCustomers(
  storeId: number,
  opts: { page?: number; limit?: number; search?: string }
) {
  const page = Math.max(1, Number(opts.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(opts.limit) || 20));
  const offset = (page - 1) * limit;

  const where: string[] = ['c.store_id = ?'];
  const params: any[] = [storeId];

  if (opts.search) {
    where.push('(c.full_name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)');
    const term = `%${opts.search}%`;
    params.push(term, term, term);
  }

  const whereClause = where.join(' AND ');

  const [rows]: any = await pool.query(
    `SELECT
        c.id,
        c.full_name,
        c.email,
        c.phone,
        c.created_at,
        (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) AS total_orders,
        (SELECT COALESCE(SUM(o.total_inr), 0) FROM orders o
           WHERE o.customer_id = c.id AND o.status != 'CANCELLED') AS total_spent_inr
     FROM customers c
     WHERE ${whereClause}
     ORDER BY c.id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [cnt]: any = await pool.query(
    `SELECT COUNT(*) AS total FROM customers c WHERE ${whereClause}`,
    params
  );

  return {
    items: rows,
    pagination: {
      page,
      limit,
      total: Number(cnt[0].total),
      totalPages: Math.ceil(Number(cnt[0].total) / limit),
    },
  };
}

export async function getStoreCustomer(storeId: number, customerId: number) {
  const [rows]: any = await pool.query(
    'SELECT id, full_name, email, phone, created_at FROM customers WHERE id = ? AND store_id = ? LIMIT 1',
    [customerId, storeId]
  );
  if (!rows.length) throw new AppError(404, 'Customer not found');

  const customer = rows[0];

  const [orders]: any = await pool.query(
    `SELECT id, order_number, status, total_inr, payment_method, payment_status, created_at
     FROM orders
     WHERE customer_id = ?
     ORDER BY id DESC`,
    [customerId]
  );

  return { ...customer, orders };
}