import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';
import { unauthorized, forbidden } from '../utils/http';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : undefined;
  const token = req.cookies?.token || bearer;

  if (!token) return unauthorized(res, 'Authentication required');

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return unauthorized(res, 'Invalid or expired token');
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return unauthorized(res);
    if (!roles.includes(req.user.role)) return forbidden(res, 'Insufficient role');
    next();
  };
}