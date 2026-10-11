import { pool } from '../../database/pool';
import { AppError } from '../../utils/errors';

/**
 * Cart is store-scoped and user-scoped.
 * We use one cart per (user, store) combination.
 */

export async function getOrCreateCart(userId: number, storeId: number) {
  const [existing]: any = await pool.query(
    'SELECT id, store_id, user_id FROM carts WHERE user_id = ? AND store_id = ? LIMIT 1',
    [userId, storeId]
  );
  if (existing.length) return existing[0];

  const [result]: any = await pool.query(
    'INSERT INTO carts (user_id, store_id) VALUES (?, ?)',
    [userId, storeId]
  );
  return { id: result.insertId, store_id: storeId, user_id: userId };
}

/**
 * Resolve a store by slug (for cart context).
 */
export async function resolveStoreIdBySlug(slug: string): Promise<number> {
  const [rows]: any = await pool.query(
    'SELECT id FROM stores WHERE slug = ? AND status = ? LIMIT 1',
    [slug, 'ACTIVE']
  );
  if (!rows.length) throw new AppError(404, 'Store not found');
  return rows[0].id;
}

export async function getCartWithItems(userId: number, storeId: number) {
  const cart = await getOrCreateCart(userId, storeId);

  const [items]: any = await pool.query(
    `SELECT
        ci.id,
        ci.product_id,
        ci.quantity,
        p.name,
        p.slug,
        p.price_inr,
        p.stock_quantity,
        p.image_url,
        (ci.quantity * p.price_inr) AS line_total
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     WHERE ci.cart_id = ?
     ORDER BY ci.id ASC`,
    [cart.id]
  );

  const subtotal = items.reduce(
    (sum: number, it: any) => sum + Number(it.line_total),
    0
  );

  return {
    cart_id: cart.id,
    store_id: storeId,
    items,
    subtotal_inr: Number(subtotal.toFixed(2)),
    item_count: items.reduce((sum: number, it: any) => sum + it.quantity, 0),
  };
}

export async function addItemToCart(
  userId: number,
  storeId: number,
  productId: number,
  quantity: number
) {
  if (quantity <= 0) throw new AppError(400, 'Quantity must be positive');

  const cart = await getOrCreateCart(userId, storeId);

  // Verify product belongs to the same store and is active
  const [productRows]: any = await pool.query(
    'SELECT id, stock_quantity, is_active FROM products WHERE id = ? AND store_id = ? LIMIT 1',
    [productId, storeId]
  );
  if (!productRows.length) throw new AppError(404, 'Product not found in this store');

  const product = productRows[0];
  if (!product.is_active) throw new AppError(400, 'Product is not available');

  // Check existing quantity in cart
  const [existingItem]: any = await pool.query(
    'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ? LIMIT 1',
    [cart.id, productId]
  );

  const currentQty = existingItem.length ? existingItem[0].quantity : 0;
  const newQty = currentQty + quantity;

  if (newQty > product.stock_quantity) {
    throw new AppError(
      400,
      `Only ${product.stock_quantity} items available in stock`
    );
  }

  if (existingItem.length) {
    await pool.query(
      'UPDATE cart_items SET quantity = ? WHERE id = ?',
      [newQty, existingItem[0].id]
    );
  } else {
    await pool.query(
      'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)',
      [cart.id, productId, quantity]
    );
  }

  return getCartWithItems(userId, storeId);
}

export async function updateCartItemQuantity(
  userId: number,
  storeId: number,
  cartItemId: number,
  quantity: number
) {
  if (quantity < 1) throw new AppError(400, 'Quantity must be at least 1');

  const cart = await getOrCreateCart(userId, storeId);

  const [itemRows]: any = await pool.query(
    `SELECT ci.id, ci.product_id, p.stock_quantity
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     WHERE ci.id = ? AND ci.cart_id = ? LIMIT 1`,
    [cartItemId, cart.id]
  );
  if (!itemRows.length) throw new AppError(404, 'Cart item not found');

  const item = itemRows[0];
  if (quantity > item.stock_quantity) {
    throw new AppError(
      400,
      `Only ${item.stock_quantity} items available in stock`
    );
  }

  await pool.query('UPDATE cart_items SET quantity = ? WHERE id = ?', [
    quantity,
    cartItemId,
  ]);

  return getCartWithItems(userId, storeId);
}

export async function removeCartItem(
  userId: number,
  storeId: number,
  cartItemId: number
) {
  const cart = await getOrCreateCart(userId, storeId);
  await pool.query('DELETE FROM cart_items WHERE id = ? AND cart_id = ?', [
    cartItemId,
    cart.id,
  ]);
  return getCartWithItems(userId, storeId);
}

export async function clearCart(cartId: number) {
  await pool.query('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
}