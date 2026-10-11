import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';

import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error';
import authRoutes from './modules/auth/auth.routes';

const app = express();

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

app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

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

app.use('/api/auth', authRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;