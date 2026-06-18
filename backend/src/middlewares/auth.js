import jwt from 'jsonwebtoken';
import { AppError } from './error.js';
import User from '../models/User.js';

/**
 * Middleware to protect routes - verifies JWT and hydrates req.user context
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    // 1. Extract token from Authorization header (Bearer <token>)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('You are not logged in! Please log in to get access.', 401));
    }

    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Check if user still exists
    const currentUser = await User.findById(decoded.userId).populate('clientId', 'name');
    if (!currentUser) {
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    // 4. Hydrate context to request object
    req.user = currentUser;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to restrict access by role
 */
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('You are not authenticated.', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action.', 403));
    }

    next();
  };
};
