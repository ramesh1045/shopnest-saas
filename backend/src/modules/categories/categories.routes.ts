import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/async';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { resolveUserStore } from '../../middleware/tenant';
import { created, ok } from '../../utils/http';
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from './categories.service';

const router = Router();

const categorySchema = z.object({
  name: z.string().min(1).max(120),
});

// List categories for the current store
router.get(
  '/',
  requireAuth,
  requireRole('STORE_OWNER', 'STORE_MANAGER', 'STORE_STAFF'),
  resolveUserStore,
  asyncHandler(async (req, res) => {
    const categories = await listCategories(req.store!.id);
    return ok(res, categories);
  })
);

// Create category
router.post(
  '/',
  requireAuth,
  requireRole('STORE_OWNER', 'STORE_MANAGER'),
  resolveUserStore,
  validateBody(categorySchema),
  asyncHandler(async (req, res) => {
    const category = await createCategory(req.store!.id, req.body);
    return created(res, category, 'Category created');
  })
);

// Update category
router.patch(
  '/:categoryId',
  requireAuth,
  requireRole('STORE_OWNER', 'STORE_MANAGER'),
  resolveUserStore,
  validateBody(categorySchema),
  asyncHandler(async (req, res) => {
    const categoryId = Number(req.params.categoryId);
    const category = await updateCategory(req.store!.id, categoryId, req.body);
    return ok(res, category, 'Category updated');
  })
);

// Delete category
router.delete(
  '/:categoryId',
  requireAuth,
  requireRole('STORE_OWNER', 'STORE_MANAGER'),
  resolveUserStore,
  asyncHandler(async (req, res) => {
    const categoryId = Number(req.params.categoryId);
    await deleteCategory(req.store!.id, categoryId);
    return ok(res, null, 'Category deleted');
  })
);

export default router;