import { pool } from '../../database/pool';
import { AppError } from '../../utils/errors';

/**
 * Platform-wide overview stats for super admin dashboard.
 */
export async function getPlatformOverview() {
  const [storesRes]: any = await pool.query(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS active,
       SUM(CASE WHEN status = 'SUSPENDED' THEN 1 ELSE 0 END) AS suspended,
       SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending
     FROM stores`
  );

  const [usersRes]: any = await pool.query(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN role = 'SUPER_ADMIN' THEN 1 ELSE 0 END) AS admins,
       SUM(CASE WHEN role = 'STORE_OWNER' THEN 1 ELSE 0 END) AS owners,
       SUM(CASE WHEN role = 'CUSTOMER' THEN 1 ELSE 0 END) AS customers
     FROM users WHERE is_active = 1`
  );

  const [subsRes]: any = await pool.query(
    `SELECT
       COUNT(*) AS total_active,
       SUM(CASE WHEN p.code = 'STARTER' THEN 1 ELSE 0 END) AS starter,
       SUM(CASE WHEN p.code = 'GROWTH'  THEN 1 ELSE 0 END) AS growth,
       SUM(CASE WHEN p.code = 'PRO'     THEN 1 ELSE 0 END) AS pro
     FROM subscriptions s
     JOIN plans p ON p.id = s.plan_id
     WHERE s.status = 'ACTIVE'`
  );

  const [mrrRes]: any = await pool.query(
    `SELECT COALESCE(SUM(p.price_inr), 0) AS mrr
     FROM subscriptions s
     JOIN plans p ON p.id = s.plan_id
     WHERE s.status = 'ACTIVE'`
  );

  const [ordersRes]: any = await pool.query(
    `SELECT
       COUNT(*) AS total_orders,
       COALESCE(SUM(CASE WHEN status != 'CANCELLED' THEN total_inr ELSE 0 END), 0) AS total_volume
     FROM orders`
  );

  return {
    stores: {
      total: Number(storesRes[0].total || 0),
      active: Number(storesRes[0].active || 0),
      suspended: Number(storesRes[0].suspended || 0),
      pending: Number(storesRes[0].pending || 0),
    },
    users: {
      total: Number(usersRes[0].total || 0),
      admins: Number(usersRes[0].admins || 0),
      owners: Number(usersRes[0].owners || 0),
      customers: Number(usersRes[0].customers || 0),
    },
    subscriptions: {
      total_active: Number(subsRes[0].total_active || 0),
      starter: Number(subsRes[0].starter || 0),
      growth: Number(subsRes[0].growth || 0),
      pro: Number(subsRes[0].pro || 0),
    },
    revenue: {
      mrr_inr: Number(mrrRes[0].mrr || 0),
      total_order_volume_inr: Number(ordersRes[0].total_volume || 0),
      total_orders: Number(ordersRes[0].total_orders || 0),
    },
  };
}

/**
 * List all stores on the platform.
 */
export async function listAllStores(opts: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}) {
  const page = Math.max(1, Number(opts.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(opts.limit) || 20));
  const offset = (page - 1) * limit;

  const where: string[] = [];
  const params: any[] = [];

  if (opts.search) {
    where.push('(s.name LIKE ? OR s.slug LIKE ?)');
    const term = `%${opts.search}%`;
    params.push(term, term);
  }
  if (opts.status) {
    where.push('s.status = ?');
    params.push(opts.status);
  }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const [rows]: any = await pool.query(
    `SELECT
       s.id, s.name, s.slug, s.status, s.created_at,
       u.email AS owner_email, u.full_name AS owner_name,
       (SELECT COUNT(*) FROM products p WHERE p.store_id = s.id) AS product_count,
       (SELECT COUNT(*) FROM orders o WHERE o.store_id = s.id) AS order_count,
       (SELECT COALESCE(SUM(o.total_inr), 0) FROM orders o
          WHERE o.store_id = s.id AND o.status != 'CANCELLED') AS revenue_inr,
       (SELECT p.code FROM subscriptions sub
          JOIN plans p ON p.id = sub.plan_id
          WHERE sub.store_id = s.id AND sub.status = 'ACTIVE'
          ORDER BY sub.id DESC LIMIT 1) AS plan_code
     FROM stores s
     JOIN users u ON u.id = s.owner_user_id
     ${whereClause}
     ORDER BY s.id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [cnt]: any = await pool.query(
    `SELECT COUNT(*) AS total FROM stores s ${whereClause}`,
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

/**
 * Get single store details.
 */
export async function getStoreDetails(storeId: number) {
  const [rows]: any = await pool.query(
    `SELECT
       s.*,
       u.email AS owner_email, u.full_name AS owner_name,
       (SELECT COUNT(*) FROM products p WHERE p.store_id = s.id) AS product_count,
       (SELECT COUNT(*) FROM orders o WHERE o.store_id = s.id) AS order_count,
       (SELECT COUNT(*) FROM customers c WHERE c.store_id = s.id) AS customer_count
     FROM stores s
     JOIN users u ON u.id = s.owner_user_id
     WHERE s.id = ? LIMIT 1`,
    [storeId]
  );
  if (!rows.length) throw new AppError(404, 'Store not found');
  return rows[0];
}

/**
 * Change a store's status (activate / suspend).
 */
export async function updateStoreStatus(
  storeId: number,
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING'
) {
  const [rows]: any = await pool.query(
    'SELECT id FROM stores WHERE id = ? LIMIT 1',
    [storeId]
  );
  if (!rows.length) throw new AppError(404, 'Store not found');

  await pool.query('UPDATE stores SET status = ? WHERE id = ?', [
    status,
    storeId,
  ]);

  return getStoreDetails(storeId);
}

/**
 * List all subscriptions on the platform.
 */
export async function listAllSubscriptions(opts: {
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, Number(opts.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(opts.limit) || 20));
  const offset = (page - 1) * limit;

  const [rows]: any = await pool.query(
    `SELECT
       s.id, s.status, s.started_at, s.current_period_end,
       st.name AS store_name, st.slug AS store_slug,
       p.code AS plan_code, p.name AS plan_name, p.price_inr
     FROM subscriptions s
     JOIN stores st ON st.id = s.store_id
     JOIN plans p ON p.id = s.plan_id
     ORDER BY s.id DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );

  const [cnt]: any = await pool.query(
    'SELECT COUNT(*) AS total FROM subscriptions'
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

/**
 * List all plans (admin view — includes inactive).
 */
export async function listAllPlans() {
  const [rows]: any = await pool.query(
    `SELECT id, code, name, price_inr, max_products, max_staff, features, is_active
     FROM plans
     ORDER BY price_inr ASC`
  );
  return rows.map((p: any) => ({
    ...p,
    features:
      typeof p.features === 'string' ? JSON.parse(p.features) : p.features,
  }));
}

/**
 * Update a plan.
 */
export async function updatePlan(
  planId: number,
  input: {
    name?: string;
    price_inr?: number;
    max_products?: number;
    max_staff?: number;
    features?: any;
    is_active?: boolean;
  }
) {
  const [rows]: any = await pool.query(
    'SELECT id FROM plans WHERE id = ? LIMIT 1',
    [planId]
  );
  if (!rows.length) throw new AppError(404, 'Plan not found');

  const fields: string[] = [];
  const params: any[] = [];

  if (input.name !== undefined) {
    fields.push('name = ?');
    params.push(input.name);
  }
  if (input.price_inr !== undefined) {
    fields.push('price_inr = ?');
    params.push(input.price_inr);
  }
  if (input.max_products !== undefined) {
    fields.push('max_products = ?');
    params.push(input.max_products);
  }
  if (input.max_staff !== undefined) {
    fields.push('max_staff = ?');
    params.push(input.max_staff);
  }
  if (input.features !== undefined) {
    fields.push('features = ?');
    params.push(JSON.stringify(input.features));
  }
  if (input.is_active !== undefined) {
    fields.push('is_active = ?');
    params.push(input.is_active ? 1 : 0);
  }

  if (!fields.length) throw new AppError(400, 'No fields to update');

  params.push(planId);
  await pool.query(`UPDATE plans SET ${fields.join(', ')} WHERE id = ?`, params);

  const [updated]: any = await pool.query(
    'SELECT * FROM plans WHERE id = ?',
    [planId]
  );
  const p = updated[0];
  if (typeof p.features === 'string') {
    try {
      p.features = JSON.parse(p.features);
    } catch {
      p.features = {};
    }
  }
  return p;
}

/**
 * Recent orders across platform.
 */
export async function listRecentOrders(limit = 10) {
  const [rows]: any = await pool.query(
    `SELECT
       o.id, o.order_number, o.status, o.total_inr,
       o.created_at, o.payment_method,
       st.name AS store_name, st.slug AS store_slug
     FROM orders o
     JOIN stores st ON st.id = o.store_id
     ORDER BY o.id DESC LIMIT ?`,
    [limit]
  );
  return rows;
}