import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/async';
import { requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { ok } from '../../utils/http';
import {
  addItemToCart,
  getCartWithItems,
  removeCartItem,
  resolveStoreIdBySlug,
  updateCartItemQuantity,
} from './carts.service';

const router = Router();

const addItemSchema = z.object({
  product_id: z.number().int().positive(),
  quantity: z.number().int().positive().max(100),
});

const updateItemSchema = z.object({
  quantity: z.number().int().positive().max(100),
});

// Get cart for a specific store (by slug)
router.get(
  '/:storeSlug',
  requireAuth,
  asyncHandler(async (req, res) => {
    const storeSlug = String(req.params.storeSlug);
    const storeId = await resolveStoreIdBySlug(storeSlug);
    const cart = await getCartWithItems(req.user!.userId, storeId);
    return ok(res, cart);
  })
);

// Add item to cart
router.post(
  '/:storeSlug/items',
  requireAuth,
  validateBody(addItemSchema),
  asyncHandler(async (req, res) => {
    const storeSlug = String(req.params.storeSlug);
    const storeId = await resolveStoreIdBySlug(storeSlug);
    const cart = await addItemToCart(
      req.user!.userId,
      storeId,
      req.body.product_id,
      req.body.quantity
    );
    return ok(res, cart, 'Item added to cart');
  })
);

// Update cart item quantity
router.patch(
  '/:storeSlug/items/:itemId',
  requireAuth,
  validateBody(updateItemSchema),
  asyncHandler(async (req, res) => {
    const storeSlug = String(req.params.storeSlug);
    const storeId = await resolveStoreIdBySlug(storeSlug);
    const cart = await updateCartItemQuantity(
      req.user!.userId,
      storeId,
      Number(req.params.itemId),
      req.body.quantity
    );
    return ok(res, cart, 'Cart updated');
  })
);

// Remove item from cart
router.delete(
  '/:storeSlug/items/:itemId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const storeSlug = String(req.params.storeSlug);
    const storeId = await resolveStoreIdBySlug(storeSlug);
    const cart = await removeCartItem(
      req.user!.userId,
      storeId,
      Number(req.params.itemId)
    );
    return ok(res, cart, 'Item removed');
  })
);

export default router;