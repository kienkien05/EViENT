import { Response } from 'express';
import type { ApiResponse, PaginatedResponse } from '../types';

/**
 * Send a success response
 */
export function success<T>(res: Response, data: T, statusCode = 200): void {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };
  res.status(statusCode).json(response);
}

/**
 * Send a success response with a message
 */
export function successMessage(res: Response, message: string, statusCode = 200): void {
  res.status(statusCode).json({
    success: true,
    message,
  });
}

/**
 * Send a success response with data and message
 */
export function successWithMessage<T>(res: Response, data: T, message: string, statusCode = 200): void {
  res.status(statusCode).json({
    success: true,
    data,
    message,
  });
}

/**
 * Send a paginated response
 */
export function paginated<T>(
  res: Response,
  data: T[],
  pagination: { page: number; limit: number; total: number }
): void {
  const response: PaginatedResponse<T> = {
    success: true,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
    },
  };
  res.json(response);
}

/**
 * Send an error response
 */
export function error(res: Response, message: string, statusCode = 400): void {
  res.status(statusCode).json({
    success: false,
    message,
  });
}

/**
 * Send a server error response (500)
 */
export function serverError(res: Response, message = 'Internal server error'): void {
  res.status(500).json({
    success: false,
    message,
  });
}

/**
 * Send a not-found response (404)
 */
export function notFound(res: Response, message = 'Resource not found'): void {
  res.status(404).json({
    success: false,
    message,
  });
}

/**
 * Send an unauthorized response (401)
 */
export function unauthorized(res: Response, message = 'Unauthorized'): void {
  res.status(401).json({
    success: false,
    message,
  });
}

/**
 * Send a forbidden response (403)
 */
export function forbidden(res: Response, message = 'Forbidden'): void {
  res.status(403).json({
    success: false,
    message,
  });
}
