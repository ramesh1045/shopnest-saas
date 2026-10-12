import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';

import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error';

import authRoutes from './modules/auth/auth.routes';
import storesRoutes from './modules/stores/stores.routes';
import categoriesRoutes from './modules/categories/categories.routes';
import productsRoutes from './modules/products/products.routes';
import subscriptionsRoutes from './modules/subscriptions/subscriptions.routes';
import cartsRoutes from './modules/carts/carts.routes';
import ordersRoutes from './modules/orders/orders.routes';
import customersRoutes from './modules/customers/customers.routes';
import adminRoutes from './modules/admin/admin.routes';

const app = express();

// Security + parsers
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static uploads
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Health
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'ShopNest API is running',
    data: {
      time: new Date().toISOString(),
      env: env.NODE_ENV,
    },
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/stores', storesRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api', productsRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/cart', cartsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/admin', adminRoutes);

// 404 + error handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;