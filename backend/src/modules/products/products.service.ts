import { pool } from '../../database/pool';
import { AppError } from '../../utils/errors';
import { slugify } from '../../utils/slug';
import { assertCanAddProduct } from '../subscriptions/subscriptions.service';

export interface ProductInput {
  name: string;
  description?: string;
  sku?: string;
  price_inr: number;
  compare_price_inr?: number;
  stock_quantity?: number;
  category_id?: number | null;
  image_url?: string;
  is_active?: boolean;
}

async function uniqueSlugForStore(
  storeId: number,
  base: string
): Promise<string> {
  let candidate = base || 'product-' + Date.now();
  let counter = 1;
  while (true) {
    const [rows]: any = await pool.query(
      'SELECT id FROM products WHERE store_id = ? AND slug = ? LIMIT 1',
      [storeId, candidate]
    );
    if (!rows.length) return candidate;
    candidate = `${base}-${counter++}`;
  }
}

/**
 * List public products for a store (used by storefront).
 * Supports pagination, category filter, and search.
 */
export async function listPublicProducts(
  storeSlug: string,
  opts: {
    page?: number;
    limit?: number;
    categoryId?: number;
    search?: string;
    sort?: 'newest' | 'price_asc' | 'price_desc';
  }
) {
  const [storeRows]: any = await pool.query(
    'SELECT id FROM stores WHERE slug = ? AND status = ? LIMIT 1',
    [storeSlug, 'ACTIVE']
  );
  if (!storeRows.length) throw new AppError(404, 'Store not found');
  const storeId = storeRows[0].id;

  const page = Math.max(1, Number(opts.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(opts.limit) || 12));
  const offset = (page - 1) * limit;

  const where: string[] = ['p.store_id = ?', 'p.is_active = 1'];
  const params: any[] = [storeId];

  if (opts.categoryId) {
    where.push('p.category_id = ?');
    params.push(opts.categoryId);
  }
  if (opts.search) {
    where.push('(p.name LIKE ? OR p.description LIKE ?)');
    const term = `%${opts.search}%`;
    params.push(term, term);
  }

  let orderBy = 'p.created_at DESC';
  if (opts.sort === 'price_asc') orderBy = 'p.price_inr ASC';
  else if (opts.sort === 'price_desc') orderBy = 'p.price_inr DESC';

  const whereClause = where.join(' AND ');

  const [rows]: any = await pool.query(
    `SELECT p.id, p.name, p.slug, p.description, p.sku, p.price_inr,
            p.compare_price_inr, p.stock_quantity, p.image_url,
            p.category_id, c.name AS category_name
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE ${whereClause}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [countRows]: any = await pool.query(
    `SELECT COUNT(*) AS total FROM products p WHERE ${whereClause}`,
    params
  );

  const total = Number(countRows[0].total);

  return {
    items: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a single public product by store slug + product id.
 */
export async function getPublicProduct(storeSlug: string, productId: number) {
  const [storeRows]: any = await pool.query(
    'SELECT id FROM stores WHERE slug = ? AND status = ? LIMIT 1',
    [storeSlug, 'ACTIVE']
  );
  if (!storeRows.length) throw new AppError(404, 'Store not found');
  const storeId = storeRows[0].id;

  const [rows]: any = await pool.query(
    `SELECT p.id, p.name, p.slug, p.description, p.sku, p.price_inr,
            p.compare_price_inr, p.stock_quantity, p.image_url,
            p.category_id, c.name AS category_name
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.id = ? AND p.store_id = ? AND p.is_active = 1 LIMIT 1`,
    [productId, storeId]
  );
  if (!rows.length) throw new AppError(404, 'Product not found');
  return rows[0];
}

/**
 * Merchant: list own store products (with search, category, status).
 */
export async function listStoreProducts(
  storeId: number,
  opts: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: number;
    isActive?: boolean;
  }
) {
  const page = Math.max(1, Number(opts.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(opts.limit) || 20));
  const offset = (page - 1) * limit;

  const where: string[] = ['p.store_id = ?'];
  const params: any[] = [storeId];

  if (opts.search) {
    where.push('(p.name LIKE ? OR p.sku LIKE ?)');
    const term = `%${opts.search}%`;
    params.push(term, term);
  }
  if (opts.categoryId) {
    where.push('p.category_id = ?');
    params.push(opts.categoryId);
  }
  if (typeof opts.isActive === 'boolean') {
    where.push('p.is_active = ?');
    params.push(opts.isActive ? 1 : 0);
  }

  const whereClause = where.join(' AND ');

  const [rows]: any = await pool.query(
    `SELECT p.*, c.name AS category_name
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE ${whereClause}
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [countRows]: any = await pool.query(
    `SELECT COUNT(*) AS total FROM products p WHERE ${whereClause}`,
    params
  );

  const total = Number(countRows[0].total);

  return {
    items: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getStoreProduct(storeId: number, productId: number) {
  const [rows]: any = await pool.query(
    `SELECT p.*, c.name AS category_name
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.id = ? AND p.store_id = ? LIMIT 1`,
    [productId, storeId]
  );
  if (!rows.length) throw new AppError(404, 'Product not found');
  return rows[0];
}

/**
 * Create a new product with plan limit enforcement.
 */
export async function createProduct(storeId: number, input: ProductInput) {
  // Enforce plan limit BEFORE insert
  await assertCanAddProduct(storeId);

  const slug = await uniqueSlugForStore(storeId, slugify(input.name));

  const [result]: any = await pool.query(
    `INSERT INTO products
      (store_id, category_id, name, slug, description, sku, price_inr,
       compare_price_inr, stock_quantity, image_url, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      storeId,
      input.category_id ?? null,
      input.name,
      slug,
      input.description ?? null,
      input.sku ?? null,
      input.price_inr,
      input.compare_price_inr ?? null,
      input.stock_quantity ?? 0,
      input.image_url ?? null,
      input.is_active === false ? 0 : 1,
    ]
  );

  return getStoreProduct(storeId, result.insertId);
}

export async function updateProduct(
  storeId: number,
  productId: number,
  input: Partial<ProductInput>
) {
  await getStoreProduct(storeId, productId);

  const fields: string[] = [];
  const params: any[] = [];

  const map: Record<string, any> = {
    category_id: input.category_id,
    name: input.name,
    description: input.description,
    sku: input.sku,
    price_inr: input.price_inr,
    compare_price_inr: input.compare_price_inr,
    stock_quantity: input.stock_quantity,
    image_url: input.image_url,
  };

  for (const [key, value] of Object.entries(map)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      params.push(value);
    }
  }

  if (input.is_active !== undefined) {
    fields.push('is_active = ?');
    params.push(input.is_active ? 1 : 0);
  }

  if (input.name) {
    fields.push('slug = ?');
    params.push(slugify(input.name));
  }

  if (!fields.length) return getStoreProduct(storeId, productId);

  params.push(productId, storeId);

  await pool.query(
    `UPDATE products SET ${fields.join(', ')} WHERE id = ? AND store_id = ?`,
    params
  );

  return getStoreProduct(storeId, productId);
}

export async function deleteProduct(storeId: number, productId: number) {
  await getStoreProduct(storeId, productId);
  await pool.query('DELETE FROM products WHERE id = ? AND store_id = ?', [
    productId,
    storeId,
  ]);
}