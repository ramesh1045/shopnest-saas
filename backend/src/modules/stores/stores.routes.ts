import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/async';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { created, ok } from '../../utils/http';
import {
  createStore,
  getCurrentStore,
  getStoreBySlug,
  updateCurrentStore,
} from './stores.service';

const router = Router();

const createSchema = z.object({
  name: z.string().min(2).max(150),
  description: z.string().max(500).optional(),
});

const updateSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  description: z.string().max(500).optional(),
  logo_url: z.string().max(500).optional(),
  banner_url: z.string().max(500).optional(),
  theme_color: z.string().max(20).optional(),
});

// Create a new store
router.post(
  '/',
  requireAuth,
  requireRole('STORE_OWNER', 'SUPER_ADMIN'),
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    const store = await createStore(req.user!.userId, req.body);
    return created(res, store, 'Store created successfully');
  })
);

// Get the authenticated user's own store
router.get(
  '/current',
  requireAuth,
  asyncHandler(async (req, res) => {
    const store = await getCurrentStore(req.user!.userId);
    return ok(res, store);
  })
);

// Update the current store
router.patch(
  '/current',
  requireAuth,
  requireRole('STORE_OWNER', 'STORE_MANAGER'),
  validateBody(updateSchema),
  asyncHandler(async (req, res) => {
    const store = await updateCurrentStore(req.user!.userId, req.body);
    return ok(res, store, 'Store updated');
  })
);

// Public: get store details by slug
router.get(
  '/by-slug/:slug',
  asyncHandler(async (req, res) => {
    const slug = String(req.params.slug);
    const store = await getStoreBySlug(slug);
    return ok(res, store);
  })
);

export default router;