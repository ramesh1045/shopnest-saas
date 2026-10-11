import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ success: false, message: 'Route not found' });
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details,
    });
  }

  console.error('[UNHANDLED ERROR]', err);

  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
}