import { pool } from '../../database/pool';
import { AppError } from '../../utils/errors';
import { slugify, ensureUniqueSlug } from '../../utils/slug';

export interface CreateStoreInput {
  name: string;
  description?: string;
}

async function slugExists(candidate: string): Promise<boolean> {
  const [rows]: any = await pool.query(
    'SELECT id FROM stores WHERE slug = ? LIMIT 1',
    [candidate]
  );
  return rows.length > 0;
}

/**
 * Create a new store owned by the given user, and assign a STARTER subscription.
 * Uses a transaction so partial failures don't leave inconsistent data.
 */
export async function createStore(
  ownerUserId: number,
  input: CreateStoreInput
) {
  const baseSlug = slugify(input.name);
  const slug = await ensureUniqueSlug(baseSlug, slugExists);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [storeResult]: any = await conn.query(
      `INSERT INTO stores (owner_user_id, name, slug, description, status)
       VALUES (?, ?, ?, ?, 'ACTIVE')`,
      [ownerUserId, input.name, slug, input.description || null]
    );
    const storeId = storeResult.insertId;

    // Attach owner as STORE_OWNER
    await conn.query(
      `INSERT INTO store_members (store_id, user_id, role)
       VALUES (?, ?, 'STORE_OWNER')`,
      [storeId, ownerUserId]
    );

    // Assign STARTER plan for 30 days
    const [planRows]: any = await conn.query(
      `SELECT id FROM plans WHERE code = 'STARTER' LIMIT 1`
    );
    if (!planRows.length) {
      throw new AppError(500, 'STARTER plan not seeded');
    }
    const planId = planRows[0].id;

    const now = new Date();
    const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await conn.query(
      `INSERT INTO subscriptions (store_id, plan_id, status, started_at, current_period_end)
       VALUES (?, ?, 'ACTIVE', ?, ?)`,
      [storeId, planId, now, end]
    );

    await conn.commit();

    return {
      id: storeId,
      name: input.name,
      slug,
      description: input.description || null,
      status: 'ACTIVE',
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function getStoreBySlug(slug: string) {
  const [rows]: any = await pool.query(
    `SELECT id, name, slug, description, logo_url, banner_url, theme_color, status, created_at
     FROM stores WHERE slug = ? LIMIT 1`,
    [slug]
  );
  if (!rows.length) throw new AppError(404, 'Store not found');
  if (rows[0].status !== 'ACTIVE') throw new AppError(403, 'Store is not active');
  return rows[0];
}

export async function getCurrentStore(userId: number) {
  const [rows]: any = await pool.query(
    `SELECT s.id, s.name, s.slug, s.description, s.logo_url, s.banner_url,
            s.theme_color, s.status, s.created_at, m.role
     FROM stores s
     JOIN store_members m ON m.store_id = s.id
     WHERE m.user_id = ? AND m.is_active = 1
     ORDER BY s.id ASC LIMIT 1`,
    [userId]
  );
  if (!rows.length) throw new AppError(404, 'No store found for this user');
  return rows[0];
}

export async function updateCurrentStore(
  userId: number,
  input: {
    name?: string;
    description?: string;
    logo_url?: string;
    banner_url?: string;
    theme_color?: string;
  }
) {
  const store = await getCurrentStore(userId);
  const fields: string[] = [];
  const params: any[] = [];

  if (input.name !== undefined) {
    fields.push('name = ?');
    params.push(input.name);
  }
  if (input.description !== undefined) {
    fields.push('description = ?');
    params.push(input.description);
  }
  if (input.logo_url !== undefined) {
    fields.push('logo_url = ?');
    params.push(input.logo_url);
  }
  if (input.banner_url !== undefined) {
    fields.push('banner_url = ?');
    params.push(input.banner_url);
  }
  if (input.theme_color !== undefined) {
    fields.push('theme_color = ?');
    params.push(input.theme_color);
  }

  if (!fields.length) return store;

  params.push(store.id);
  await pool.query(`UPDATE stores SET ${fields.join(', ')} WHERE id = ?`, params);

  return getCurrentStore(userId);
}