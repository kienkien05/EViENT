import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import type { JwtPayload, UserRole } from '../types';
import * as respond from '../utils/responseHelper';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Verify JWT token and attach user payload to request
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      respond.unauthorized(res, 'Access token required');
      return;
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      respond.serverError(res, 'JWT_SECRET not configured');
      return;
    }

    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      respond.unauthorized(res, 'Token expired');
      return;
    }
    respond.unauthorized(res, 'Invalid token');
  }
}

/**
 * Check if user has required role(s)
 */
export function authorize(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      respond.unauthorized(res, 'Authentication required');
      return;
    }
    if (!roles.includes(req.user.role)) {
      respond.forbidden(res, 'Insufficient permissions');
      return;
    }
    next();
  };
}

/**
 * Validate request using express-validator rules
 */
export function validate(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array().map((e) => ({
        field: (e as any).path || (e as any).param,
        message: e.msg,
      })),
    });
    return;
  }
  next();
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Global error handler middleware
 */
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction): void {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  if (process.env.NODE_ENV !== 'production') {
    console.error('Error:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}
