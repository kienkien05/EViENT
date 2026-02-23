import { query, body, param, ValidationChain } from 'express-validator';

/**
 * Common pagination validation
 */
export const paginationRules: ValidationChain[] = [
  query('page').optional().isInt({ min: 1 }).toInt().withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt().withMessage('Limit must be between 1 and 100'),
  query('search').optional().isString().trim(),
];

/**
 * Email validation
 */
export const emailRule = (field = 'email'): ValidationChain =>
  body(field).isEmail().normalizeEmail().withMessage('Valid email is required');

/**
 * Password validation
 */
export const passwordRule = (field = 'password'): ValidationChain =>
  body(field)
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters');

/**
 * MongoDB ObjectId param validation
 */
export const objectIdParam = (paramName = 'id'): ValidationChain =>
  param(paramName).isMongoId().withMessage(`Invalid ${paramName} format`);

/**
 * Required string body field
 */
export const requiredString = (field: string, label?: string): ValidationChain =>
  body(field)
    .notEmpty()
    .withMessage(`${label || field} is required`)
    .isString()
    .trim();
