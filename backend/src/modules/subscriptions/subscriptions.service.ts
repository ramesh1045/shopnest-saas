import { pool } from '../../database/pool';
import { AppError } from '../../utils/errors';

export interface ActiveSubscription {
  subscription_id: number;
  plan_id: number;
  plan_code: string;
  plan_name: string;
  price_inr: number;
  max_products: number;
  max_staff: number;
  features: any;
  status: string;
  started_at: Date;
  current_period_end: Date;
}

/**
 * Fetch the active subscription for a store.
 * If multiple subscriptions exist, the most recent ACTIVE wins.
 */
export async function getActiveSubscription(
  storeId: number
): Promise<ActiveSubscription | null> {
  const [rows]: any = await pool.query(
    `SELECT
        s.id AS subscription_id,
        s.plan_id,
        p.code AS plan_code,
        p.name AS plan_name,
        p.price_inr,
        p.max_products,
        p.max_staff,
        p.features,
        s.status,
        s.started_at,
        s.current_period_end
     FROM subscriptions s
     JOIN plans p ON p.id = s.plan_id
     WHERE s.store_id = ? AND s.status = 'ACTIVE'
     ORDER BY s.id DESC LIMIT 1`,
    [storeId]
  );

  if (!rows.length) return null;

  const row = rows[0];
  if (typeof row.features === 'string') {
    try {
      row.features = JSON.parse(row.features);
    } catch {
      row.features = {};
    }
  }
  return row;
}

export async function requireActiveSubscription(
  storeId: number
): Promise<ActiveSubscription> {
  const sub = await getActiveSubscription(storeId);
  if (!sub) {
    throw new AppError(403, 'No active subscription for this store');
  }
  return sub;
}

/**
 * Enforce the max_products limit for a store.
 * Call BEFORE inserting a new product.
 */
export async function assertCanAddProduct(storeId: number) {
  const sub = await requireActiveSubscription(storeId);

  const [rows]: any = await pool.query(
    `SELECT COUNT(*) AS count
     FROM products
     WHERE store_id = ? AND is_active = 1`,
    [storeId]
  );
  const activeCount = Number(rows[0].count);

  if (activeCount >= sub.max_products) {
    throw new AppError(
      403,
      `Plan limit reached: ${sub.plan_name} allows ${sub.max_products} active products. Upgrade to add more.`
    );
  }

  return sub;
}

/**
 * Enforce the max_staff limit for a store.
 */
export async function assertCanAddStaff(storeId: number) {
  const sub = await requireActiveSubscription(storeId);

  const [rows]: any = await pool.query(
    `SELECT COUNT(*) AS count
     FROM store_members
     WHERE store_id = ? AND is_active = 1 AND role IN ('STORE_MANAGER','STORE_STAFF')`,
    [storeId]
  );
  const staffCount = Number(rows[0].count);

  if (staffCount >= sub.max_staff) {
    throw new AppError(
      403,
      `Plan limit reached: ${sub.plan_name} allows ${sub.max_staff} staff members.`
    );
  }

  return sub;
}