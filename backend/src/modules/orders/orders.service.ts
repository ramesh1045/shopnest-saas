import { pool } from '../../database/pool';
import { AppError } from '../../utils/errors';
import { generateOrderNumber } from '../../utils/orderNumber';
import { clearCart, getCartWithItems, resolveStoreIdBySlug } from '../carts/carts.service';
import { deductStockForOrder, restoreStockForOrder } from '../inventory/inventory.service';

export interface ShippingAddress {
  full_name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface CheckoutInput {
  store_slug: string;
  customer_name: string;
  customer_email?: string;
  customer_phone: string;
  shipping_address: ShippingAddress;
  payment_method?: 'COD' | 'SIMULATED';
}

/**
 * Checkout: create customer, create order + items, deduct stock, clear cart.
 * All within a single DB transaction.
 * NEVER trusts client-side prices — always reads from products table.
 */
export async function checkout(userId: number, input: CheckoutInput) {
  const storeId = await resolveStoreIdBySlug(input.store_slug);

  const cart = await getCartWithItems(userId, storeId);
  if (!cart.items.length) throw new AppError(400, 'Cart is empty');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Re-validate stock and compute server-side totals
    const [productRows]: any = await conn.query(
      `SELECT id, name, price_inr, stock_quantity, is_active
       FROM products
       WHERE id IN (${cart.items.map(() => '?').join(',')}) AND store_id = ?
       FOR UPDATE`,
      [...cart.items.map((i: any) => i.product_id), storeId]
    );

    const productMap = new Map<number, any>();
    for (const p of productRows) productMap.set(p.id, p);

    let subtotal = 0;
    const orderItems: Array<{
      product_id: number;
      product_name: string;
      unit_price_inr: number;
      quantity: number;
      line_total_inr: number;
    }> = [];

    for (const ci of cart.items) {
      const product = productMap.get(ci.product_id);
      if (!product) throw new AppError(400, `Product ${ci.product_id} no longer available`);
      if (!product.is_active) throw new AppError(400, `Product ${product.name} is not available`);
      if (product.stock_quantity < ci.quantity) {
        throw new AppError(
          400,
          `Insufficient stock for ${product.name} (available: ${product.stock_quantity})`
        );
      }

      const unitPrice = Number(product.price_inr);
      const lineTotal = Number((unitPrice * ci.quantity).toFixed(2));
      subtotal += lineTotal;

      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        unit_price_inr: unitPrice,
        quantity: ci.quantity,
        line_total_inr: lineTotal,
      });
    }

    subtotal = Number(subtotal.toFixed(2));
    const discount = 0;
    const total = Number((subtotal - discount).toFixed(2));

    // 2. Upsert customer for this store
    const [existingCustomer]: any = await conn.query(
      'SELECT id FROM customers WHERE store_id = ? AND (phone = ? OR (email IS NOT NULL AND email = ?)) LIMIT 1',
      [storeId, input.customer_phone, input.customer_email || null]
    );

    let customerId: number;
    if (existingCustomer.length) {
      customerId = existingCustomer[0].id;
      await conn.query(
        `UPDATE customers SET full_name = ?, email = COALESCE(?, email), phone = ?
         WHERE id = ?`,
        [input.customer_name, input.customer_email || null, input.customer_phone, customerId]
      );
    } else {
      const [res]: any = await conn.query(
        `INSERT INTO customers (store_id, user_id, email, phone, full_name)
         VALUES (?, ?, ?, ?, ?)`,
        [storeId, userId, input.customer_email || null, input.customer_phone, input.customer_name]
      );
      customerId = res.insertId;
    }

    // 3. Generate order number
    const orderNumber = await generateOrderNumber();

    // 4. Insert order
    const [orderRes]: any = await conn.query(
      `INSERT INTO orders
        (store_id, customer_id, order_number, status, subtotal_inr, discount_inr,
         total_inr, payment_method, payment_status, shipping_address)
       VALUES (?, ?, ?, 'PENDING', ?, ?, ?, ?, 'PENDING', ?)`,
      [
        storeId,
        customerId,
        orderNumber,
        subtotal,
        discount,
        total,
        input.payment_method || 'COD',
        JSON.stringify(input.shipping_address),
      ]
    );
    const orderId = orderRes.insertId;

    // 5. Insert order items (price snapshots)
    for (const oi of orderItems) {
      await conn.query(
        `INSERT INTO order_items
          (order_id, product_id, product_name, unit_price_inr, quantity, line_total_inr)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, oi.product_id, oi.product_name, oi.unit_price_inr, oi.quantity, oi.line_total_inr]
      );
    }

    // 6. Deduct stock
    await deductStockForOrder(
      conn,
      storeId,
      orderItems.map((oi) => ({ product_id: oi.product_id, quantity: oi.quantity }))
    );

    await conn.commit();

    // 7. Clear cart after successful commit
    await clearCart(cart.cart_id);

    return {
      order_id: orderId,
      order_number: orderNumber,
      status: 'PENDING',
      subtotal_inr: subtotal,
      discount_inr: discount,
      total_inr: total,
      payment_method: input.payment_method || 'COD',
      payment_status: 'PENDING',
      item_count: orderItems.length,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Customer's own order history (across all stores).
 */
export async function listMyOrders(userId: number) {
  const [rows]: any = await pool.query(
    `SELECT o.id, o.order_number, o.status, o.total_inr, o.payment_method,
            o.payment_status, o.created_at,
            s.name AS store_name, s.slug AS store_slug
     FROM orders o
     JOIN customers c ON c.id = o.customer_id
     JOIN stores s ON s.id = o.store_id
     WHERE c.user_id = ?
     ORDER BY o.id DESC`,
    [userId]
  );
  return rows;
}

export async function getMyOrder(userId: number, orderId: number) {
  const [rows]: any = await pool.query(
    `SELECT o.*, s.name AS store_name, s.slug AS store_slug
     FROM orders o
     JOIN customers c ON c.id = o.customer_id
     JOIN stores s ON s.id = o.store_id
     WHERE o.id = ? AND c.user_id = ? LIMIT 1`,
    [orderId, userId]
  );
  if (!rows.length) throw new AppError(404, 'Order not found');

  const order = rows[0];
  if (typeof order.shipping_address === 'string') {
    try {
      order.shipping_address = JSON.parse(order.shipping_address);
    } catch {}
  }

  const [items]: any = await pool.query(
    `SELECT id, product_id, product_name, unit_price_inr, quantity, line_total_inr
     FROM order_items WHERE order_id = ?`,
    [orderId]
  );

  return { ...order, items };
}

/**
 * Merchant: list orders for the store.
 */
export async function listStoreOrders(
  storeId: number,
  opts: {
    page?: number;
    limit?: number;
    status?: string;
  }
) {
  const page = Math.max(1, Number(opts.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(opts.limit) || 20));
  const offset = (page - 1) * limit;

  const where: string[] = ['o.store_id = ?'];
  const params: any[] = [storeId];
  if (opts.status) {
    where.push('o.status = ?');
    params.push(opts.status);
  }

  const whereClause = where.join(' AND ');

  const [rows]: any = await pool.query(
    `SELECT o.id, o.order_number, o.status, o.total_inr, o.payment_method,
            o.payment_status, o.created_at,
            c.full_name AS customer_name, c.phone AS customer_phone
     FROM orders o
     JOIN customers c ON c.id = o.customer_id
     WHERE ${whereClause}
     ORDER BY o.id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [cnt]: any = await pool.query(
    `SELECT COUNT(*) AS total FROM orders o WHERE ${whereClause}`,
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

export async function getStoreOrder(storeId: number, orderId: number) {
  const [rows]: any = await pool.query(
    `SELECT o.*, c.full_name AS customer_name, c.phone AS customer_phone, c.email AS customer_email
     FROM orders o
     JOIN customers c ON c.id = o.customer_id
     WHERE o.id = ? AND o.store_id = ? LIMIT 1`,
    [orderId, storeId]
  );
  if (!rows.length) throw new AppError(404, 'Order not found');

  const order = rows[0];
  if (typeof order.shipping_address === 'string') {
    try {
      order.shipping_address = JSON.parse(order.shipping_address);
    } catch {}
  }

  const [items]: any = await pool.query(
    `SELECT id, product_id, product_name, unit_price_inr, quantity, line_total_inr
     FROM order_items WHERE order_id = ?`,
    [orderId]
  );

  return { ...order, items };
}

/**
 * Merchant: update order status.
 * Handles stock restoration on cancellation.
 */
export async function updateOrderStatus(
  storeId: number,
  orderId: number,
  newStatus: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
) {
  const order = await getStoreOrder(storeId, orderId);

  if (order.status === 'CANCELLED' && newStatus !== 'CANCELLED') {
    throw new AppError(400, 'Cannot change status of a cancelled order');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      'UPDATE orders SET status = ? WHERE id = ? AND store_id = ?',
      [newStatus, orderId, storeId]
    );

    if (newStatus === 'CANCELLED' && order.status !== 'CANCELLED') {
      await restoreStockForOrder(
        conn,
        storeId,
        order.items.map((it: any) => ({
          product_id: it.product_id,
          quantity: it.quantity,
        })),
        orderId
      );
    }

    if (newStatus === 'DELIVERED' && order.payment_method === 'COD') {
      await conn.query(
        "UPDATE orders SET payment_status = 'PAID' WHERE id = ?",
        [orderId]
      );
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return getStoreOrder(storeId, orderId);
}