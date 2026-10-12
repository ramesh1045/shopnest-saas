import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/async';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { ok } from '../../utils/http';
import {
  getPlatformOverview,
  getStoreDetails,
  listAllPlans,
  listAllStores,
  listAllSubscriptions,
  listRecentOrders,
  updatePlan,
  updateStoreStatus,
} from './admin.service';

const router = Router();

// All admin routes require SUPER_ADMIN
router.use(requireAuth, requireRole('SUPER_ADMIN'));

const storeStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING']),
});

const planUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  price_inr: z.number().nonnegative().optional(),
  max_products: z.number().int().nonnegative().optional(),
  max_staff: z.number().int().nonnegative().optional(),
  features: z.record(z.string(), z.any()).optional(),
  is_active: z.boolean().optional(),
});

// Platform overview
router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const stats = await getPlatformOverview();
    return ok(res, stats);
  })
);

// Recent orders (across platform)
router.get(
  '/recent-orders',
  asyncHandler(async (req, res) => {
    const orders = await listRecentOrders(10);
    return ok(res, orders);
  })
);

// Stores
router.get(
  '/stores',
  asyncHandler(async (req, res) => {
    const result = await listAllStores({
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      search: req.query.search ? String(req.query.search) : undefined,
      status: req.query.status ? String(req.query.status) : undefined,
    });
    return ok(res, result);
  })
);

router.get(
  '/stores/:storeId',
  asyncHandler(async (req, res) => {
    const store = await getStoreDetails(Number(req.params.storeId));
    return ok(res, store);
  })
);

router.patch(
  '/stores/:storeId/status',
  validateBody(storeStatusSchema),
  asyncHandler(async (req, res) => {
    const store = await updateStoreStatus(
      Number(req.params.storeId),
      req.body.status
    );
    return ok(res, store, 'Store status updated');
  })
);

// Subscriptions
router.get(
  '/subscriptions',
  asyncHandler(async (req, res) => {
    const result = await listAllSubscriptions({
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    });
    return ok(res, result);
  })
);

// Plans
router.get(
  '/plans',
  asyncHandler(async (req, res) => {
    const plans = await listAllPlans();
    return ok(res, plans);
  })
);

router.patch(
  '/plans/:planId',
  validateBody(planUpdateSchema),
  asyncHandler(async (req, res) => {
    const plan = await updatePlan(Number(req.params.planId), req.body);
    return ok(res, plan, 'Plan updated');
  })
);

export default router;