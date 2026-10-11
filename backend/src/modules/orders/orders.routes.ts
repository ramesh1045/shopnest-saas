import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/async';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { resolveUserStore } from '../../middleware/tenant';
import { created, ok } from '../../utils/http';
import {
  checkout,
  getMyOrder,
  getStoreOrder,
  listMyOrders,
  listStoreOrders,
  updateOrderStatus,
} from './orders.service';

const router = Router();

const shippingSchema = z.object({
  full_name: z.string().min(2).max(150),
  phone: z.string().min(6).max(20),
  line1: z.string().min(3).max(255),
  line2: z.string().max(255).optional(),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  pincode: z.string().min(4).max(10),
});

const checkoutSchema = z.object({
  store_slug: z.string().min(1),
  customer_name: z.string().min(2).max(150),
  customer_email: z.string().email().optional(),
  customer_phone: z.string().min(6).max(20),
  shipping_address: shippingSchema,
  payment_method: z.enum(['COD', 'SIMULATED']).optional(),
});

const statusSchema = z.object({
  status: z.enum([
    'PENDING',
    'CONFIRMED',
    'PROCESSING',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED',
  ]),
});

// ============ CUSTOMER ROUTES ============

// Checkout (create order from cart)
router.post(
  '/checkout',
  requireAuth,
  validateBody(checkoutSchema),
  asyncHandler(async (req, res) => {
    const result = await checkout(req.user!.userId, req.body);
    return created(res, result, 'Order placed successfully');
  })
);

// My order history
router.get(
  '/my',
  requireAuth,
  asyncHandler(async (req, res) => {
    const orders = await listMyOrders(req.user!.userId);
    return ok(res, orders);
  })
);

// My single order
router.get(
  '/my/:orderId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const order = await getMyOrder(req.user!.userId, Number(req.params.orderId));
    return ok(res, order);
  })
);

// ============ MERCHANT ROUTES ============

// List store orders
router.get(
  '/',
  requireAuth,
  requireRole('STORE_OWNER', 'STORE_MANAGER', 'STORE_STAFF'),
  resolveUserStore,
  asyncHandler(async (req, res) => {
    const result = await listStoreOrders(req.store!.id, {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      status: req.query.status ? String(req.query.status) : undefined,
    });
    return ok(res, result);
  })
);

// Get single store order
router.get(
  '/:orderId',
  requireAuth,
  requireRole('STORE_OWNER', 'STORE_MANAGER', 'STORE_STAFF'),
  resolveUserStore,
  asyncHandler(async (req, res) => {
    const order = await getStoreOrder(req.store!.id, Number(req.params.orderId));
    return ok(res, order);
  })
);

// Update order status
router.patch(
  '/:orderId/status',
  requireAuth,
  requireRole('STORE_OWNER', 'STORE_MANAGER'),
  resolveUserStore,
  validateBody(statusSchema),
  asyncHandler(async (req, res) => {
    const order = await updateOrderStatus(
      req.store!.id,
      Number(req.params.orderId),
      req.body.status
    );
    return ok(res, order, 'Order status updated');
  })
);

export default router;