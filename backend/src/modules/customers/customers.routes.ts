import { Router } from 'express';
import { asyncHandler } from '../../utils/async';
import { requireAuth, requireRole } from '../../middleware/auth';
import { resolveUserStore } from '../../middleware/tenant';
import { ok } from '../../utils/http';
import { getStoreCustomer, listStoreCustomers } from './customers.service';

const router = Router();

// Merchant: list customers
router.get(
  '/',
  requireAuth,
  requireRole('STORE_OWNER', 'STORE_MANAGER', 'STORE_STAFF'),
  resolveUserStore,
  asyncHandler(async (req, res) => {
    const result = await listStoreCustomers(req.store!.id, {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      search: req.query.search ? String(req.query.search) : undefined,
    });
    return ok(res, result);
  })
);

// Merchant: get single customer with order history
router.get(
  '/:customerId',
  requireAuth,
  requireRole('STORE_OWNER', 'STORE_MANAGER', 'STORE_STAFF'),
  resolveUserStore,
  asyncHandler(async (req, res) => {
    const customer = await getStoreCustomer(
      req.store!.id,
      Number(req.params.customerId)
    );
    return ok(res, customer);
  })
);

export default router;