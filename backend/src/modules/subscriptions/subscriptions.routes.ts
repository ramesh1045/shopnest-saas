import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/async';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { resolveUserStore } from '../../middleware/tenant';
import { ok } from '../../utils/http';
import { pool } from '../../database/pool';
import { AppError } from '../../utils/errors';
import { getActiveSubscription } from './subscriptions.service';

const router = Router();

const changePlanSchema = z.object({
  plan_code: z.enum(['STARTER', 'GROWTH', 'PRO']),
});

// List all active plans (public — pricing page)
router.get(
  '/plans',
  asyncHandler(async (req, res) => {
    const [rows]: any = await pool.query(
      `SELECT id, code, name, price_inr, max_products, max_staff, features
       FROM plans WHERE is_active = 1 ORDER BY price_inr ASC`
    );
    const plans = rows.map((p: any) => ({
      ...p,
      features: typeof p.features === 'string' ? JSON.parse(p.features) : p.features,
    }));
    return ok(res, plans);
  })
);

// Get current subscription for the authenticated user's store
router.get(
  '/current',
  requireAuth,
  resolveUserStore,
  asyncHandler(async (req, res) => {
    const sub = await getActiveSubscription(req.store!.id);
    if (!sub) throw new AppError(404, 'No active subscription');
    return ok(res, sub);
  })
);

// Change the store's plan (dev-mode: immediate switch)
router.post(
  '/change-plan',
  requireAuth,
  requireRole('STORE_OWNER'),
  resolveUserStore,
  validateBody(changePlanSchema),
  asyncHandler(async (req, res) => {
    const [planRows]: any = await pool.query(
      'SELECT id, code, name FROM plans WHERE code = ? AND is_active = 1 LIMIT 1',
      [req.body.plan_code]
    );
    if (!planRows.length) throw new AppError(404, 'Plan not found');

    const newPlan = planRows[0];

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(
        `UPDATE subscriptions SET status = 'CANCELLED', cancelled_at = NOW()
         WHERE store_id = ? AND status = 'ACTIVE'`,
        [req.store!.id]
      );

      const now = new Date();
      const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      await conn.query(
        `INSERT INTO subscriptions
         (store_id, plan_id, status, started_at, current_period_end)
         VALUES (?, ?, 'ACTIVE', ?, ?)`,
        [req.store!.id, newPlan.id, now, end]
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    return ok(res, { plan_code: newPlan.code, plan_name: newPlan.name }, 'Plan changed');
  })
);

// Cancel current subscription
router.post(
  '/cancel',
  requireAuth,
  requireRole('STORE_OWNER'),
  resolveUserStore,
  asyncHandler(async (req, res) => {
    await pool.query(
      `UPDATE subscriptions SET status = 'CANCELLED', cancelled_at = NOW()
       WHERE store_id = ? AND status = 'ACTIVE'`,
      [req.store!.id]
    );
    return ok(res, null, 'Subscription cancelled');
  })
);

export default router;