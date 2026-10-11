import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/async';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { resolveUserStore } from '../../middleware/tenant';
import { created, ok } from '../../utils/http';
import {
  createProduct,
  deleteProduct,
  getPublicProduct,
  listPublicProducts,
  listStoreProducts,
  updateProduct,
} from './products.service';

const router = Router();

const productSchema = z.object({
  name: z.string().min(2).max(255),
  description: z.string().max(5000).optional(),
  sku: z.string().max(100).optional(),
  price_inr: z.number().positive(),
  compare_price_inr: z.number().positive().optional(),
  stock_quantity: z.number().int().min(0).optional(),
  category_id: z.number().int().positive().nullable().optional(),
  image_url: z.string().max(500).optional(),
  is_active: z.boolean().optional(),
});

const productUpdateSchema = productSchema.partial();

// ============ PUBLIC STOREFRONT ROUTES ============

// List products for a store by slug (public)
router.get(
  '/public/:storeSlug/products',
  asyncHandler(async (req, res) => {
    const storeSlug = String(req.params.storeSlug);
    const result = await listPublicProducts(storeSlug, {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 12,
      categoryId: req.query.categoryId ? Number(req.query.categoryId) : undefined,
      search: req.query.search ? String(req.query.search) : undefined,
      sort: req.query.sort as any,
    });
    return ok(res, result);
  })
);

// Single product for a store (public)
router.get(
  '/public/:storeSlug/products/:productId',
  asyncHandler(async (req, res) => {
    const storeSlug = String(req.params.storeSlug);
    const productId = Number(req.params.productId);
    const product = await getPublicProduct(storeSlug, productId);
    return ok(res, product);
  })
);

// ============ MERCHANT ROUTES ============

// List own store products
router.get(
  '/products',
  requireAuth,
  requireRole('STORE_OWNER', 'STORE_MANAGER', 'STORE_STAFF'),
  resolveUserStore,
  asyncHandler(async (req, res) => {
    const result = await listStoreProducts(req.store!.id, {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      search: req.query.search ? String(req.query.search) : undefined,
      categoryId: req.query.categoryId ? Number(req.query.categoryId) : undefined,
      isActive:
        req.query.isActive === undefined
          ? undefined
          : String(req.query.isActive) === 'true',
    });
    return ok(res, result);
  })
);

// Create product
router.post(
  '/products',
  requireAuth,
  requireRole('STORE_OWNER', 'STORE_MANAGER'),
  resolveUserStore,
  validateBody(productSchema),
  asyncHandler(async (req, res) => {
    const product = await createProduct(req.store!.id, req.body);
    return created(res, product, 'Product created');
  })
);

// Update product
router.patch(
  '/products/:productId',
  requireAuth,
  requireRole('STORE_OWNER', 'STORE_MANAGER'),
  resolveUserStore,
  validateBody(productUpdateSchema),
  asyncHandler(async (req, res) => {
    const product = await updateProduct(
      req.store!.id,
      Number(req.params.productId),
      req.body
    );
    return ok(res, product, 'Product updated');
  })
);

// Delete product
router.delete(
  '/products/:productId',
  requireAuth,
  requireRole('STORE_OWNER', 'STORE_MANAGER'),
  resolveUserStore,
  asyncHandler(async (req, res) => {
    await deleteProduct(req.store!.id, Number(req.params.productId));
    return ok(res, null, 'Product deleted');
  })
);

export default router;