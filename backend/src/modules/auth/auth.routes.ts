import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/async';
import { validateBody } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { loginUser, registerUser } from './auth.service';
import { created, ok } from '../../utils/http';
import { pool } from '../../database/pool';

const router = Router();

const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Name too short').max(150),
  role: z.enum(['CUSTOMER', 'STORE_OWNER']).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: false,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

router.post(
  '/register',
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const result = await registerUser(req.body);
    res.cookie('token', result.token, cookieOptions);
    return created(res, result, 'Registered successfully');
  })
);

router.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await loginUser(req.body.email, req.body.password);
    res.cookie('token', result.token, cookieOptions);
    return ok(res, result, 'Logged in successfully');
  })
);

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  return ok(res, null, 'Logged out');
});

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const [rows]: any = await pool.query(
      'SELECT id, email, full_name, role, created_at FROM users WHERE id = ?',
      [req.user!.userId]
    );
    if (!rows.length) return ok(res, null, 'User not found');
    return ok(res, rows[0]);
  })
);

export default router;