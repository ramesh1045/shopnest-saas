import { pool } from '../../database/pool';
import { AppError } from '../../utils/errors';
import { slugify } from '../../utils/slug';

export interface CategoryInput {
  name: string;
}

async function uniqueSlugForStore(
  storeId: number,
  base: string
): Promise<string> {
  let candidate = base || 'category-' + Date.now();
  let counter = 1;
  while (true) {
    const [rows]: any = await pool.query(
      'SELECT id FROM categories WHERE store_id = ? AND slug = ? LIMIT 1',
      [storeId, candidate]
    );
    if (!rows.length) return candidate;
    candidate = `${base}-${counter++}`;
  }
}

export async function listCategories(storeId: number) {
  const [rows]: any = await pool.query(
    `SELECT c.id, c.name, c.slug, c.created_at,
            (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
     FROM categories c
     WHERE c.store_id = ?
     ORDER BY c.name ASC`,
    [storeId]
  );
  return rows;
}

export async function createCategory(storeId: number, input: CategoryInput) {
  const slug = await uniqueSlugForStore(storeId, slugify(input.name));
  const [result]: any = await pool.query(
    'INSERT INTO categories (store_id, name, slug) VALUES (?, ?, ?)',
    [storeId, input.name, slug]
  );
  return { id: result.insertId, name: input.name, slug };
}

export async function updateCategory(
  storeId: number,
  categoryId: number,
  input: CategoryInput
) {
  const [rows]: any = await pool.query(
    'SELECT id, slug FROM categories WHERE id = ? AND store_id = ? LIMIT 1',
    [categoryId, storeId]
  );
  if (!rows.length) throw new AppError(404, 'Category not found');

  const newSlug = slugify(input.name) || rows[0].slug;
  await pool.query(
    'UPDATE categories SET name = ?, slug = ? WHERE id = ? AND store_id = ?',
    [input.name, newSlug, categoryId, storeId]
  );
  return { id: categoryId, name: input.name, slug: newSlug };
}

export async function deleteCategory(storeId: number, categoryId: number) {
  const [rows]: any = await pool.query(
    'SELECT id FROM categories WHERE id = ? AND store_id = ? LIMIT 1',
    [categoryId, storeId]
  );
  if (!rows.length) throw new AppError(404, 'Category not found');

  await pool.query('DELETE FROM categories WHERE id = ? AND store_id = ?', [
    categoryId,
    storeId,
  ]);
}