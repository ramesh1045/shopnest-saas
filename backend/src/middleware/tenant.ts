import { Request, Response, NextFunction } from 'express';
import { pool } from '../database/pool';
import { forbidden, notFound } from '../utils/http';

declare global {
  namespace Express {
    interface Request {
      store?: {
        id: number;
        slug: string;
        name: string;
        owner_user_id: number;
        status: string;
        role?: string;
      };
    }
  }
}

/**
 * Resolves a store from the URL param :storeSlug (public storefront).
 * No authentication required.
 */
export async function resolvePublicStore(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const slug = req.params.storeSlug;
  if (!slug) return notFound(res, 'Store slug missing');

  const [rows]: any = await pool.query(
    'SELECT id, slug, name, owner_user_id, status FROM stores WHERE slug = ?',
    [slug]
  );

  if (!rows.length) return notFound(res, 'Store not found');

  const store = rows[0];
  if (store.status !== 'ACTIVE') {
    return forbidden(res, 'Store is not active');
  }

  req.store = store;
  next();
}

/**
 * Resolves the store that the authenticated user is allowed to manage.
 * Requires requireAuth middleware before this.
 */
export async function resolveUserStore(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) return forbidden(res, 'Authentication required');

  const [rows]: any = await pool.query(
    `SELECT s.id, s.slug, s.name, s.owner_user_id, s.status, m.role
     FROM stores s
     JOIN store_members m ON m.store_id = s.id
     WHERE m.user_id = ? AND m.is_active = 1
     ORDER BY s.id ASC
     LIMIT 1`,
    [req.user.userId]
  );

  if (!rows.length) {
    return forbidden(res, 'No store associated with this account');
  }

  req.store = rows[0];
  next();
}

/**
 * Authorizes that the authenticated user is a member of a given storeId.
 * Used for routes that accept store-scoped resources (products, orders, etc.).
 */
export async function assertMemberOfStore(
  userId: number,
  storeId: number
): Promise<{ role: string }> {
  const [rows]: any = await pool.query(
    'SELECT role FROM store_members WHERE user_id = ? AND store_id = ? AND is_active = 1',
    [userId, storeId]
  );
  if (!rows.length) {
    const err: any = new Error('No access to this store');
    err.statusCode = 403;
    throw err;
  }
  return rows[0];
}