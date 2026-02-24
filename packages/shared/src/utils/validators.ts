import { query, body, param, ValidationChain } from 'express-validator';

/**
 * Common pagination validation
 */
export const paginationRules: ValidationChain[] = [
  query('page').optional().isInt({ min: 1 }).toInt().withMessage('Trang phải là số nguyên dương'),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt().withMessage('Giới hạn phải từ 1 đến 100'),
  query('search').optional().isString().trim(),
];

/**
 * Email validation
 */
export const emailRule = (field = 'email'): ValidationChain =>
  body(field).isEmail().normalizeEmail().withMessage('Email không hợp lệ');

/**
 * Password validation
 */
export const passwordRule = (field = 'password'): ValidationChain =>
  body(field)
    .isLength({ min: 6 })
    .withMessage('Mật khẩu phải có ít nhất 6 ký tự');

/**
 * MongoDB ObjectId param validation
 */
export const objectIdParam = (paramName = 'id'): ValidationChain =>
  param(paramName).isMongoId().withMessage(`Định dạng ${paramName} không hợp lệ`);

/**
 * Required string body field
 */
export const requiredString = (field: string, label?: string): ValidationChain =>
  body(field)
    .notEmpty()
    .withMessage(`Vui lòng nhập ${label || field}`)
    .isString()
    .trim();
