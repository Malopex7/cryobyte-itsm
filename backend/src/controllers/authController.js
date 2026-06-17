import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { AppError } from '../middlewares/error.js';

// Helper: Generate Access Token (15 min lifespan)
const generateAccessToken = (user) => {
  return jwt.sign(
    { userId: user._id, role: user.role, roles: [user.role] },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

// Helper: Generate Refresh Token (7 day lifespan)
const generateRefreshToken = (user) => {
  return jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Helper: Extract Refresh Token from request cookies or raw headers
const getRefreshTokenFromReq = (req) => {
  if (req.cookies && req.cookies.refreshToken) {
    return req.cookies.refreshToken;
  }
  if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
      const parts = cookie.split('=');
      const key = parts[0]?.trim();
      const value = parts.slice(1).join('=')?.trim();
      if (key) {
        acc[key] = value;
      }
      return acc;
    }, {});
    return cookies.refreshToken;
  }
  return null;
};

// Helper: Set Refresh Token Cookie
const setRefreshTokenCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
  });
};

/**
 * Register a new user
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password, role, clientId } = req.body;

    // Create user (schema validations will catch duplicate email, missing fields, and clientId rules)
    const newUser = await User.create({
      name,
      email,
      password,
      role,
      clientId
    });

    // Strip password from the response
    const userResponse = newUser.toObject();
    delete userResponse.password;

    res.status(201).json({
      status: 'success',
      data: {
        user: userResponse
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError('Please provide email and password', 400));
    }

    // Find user and explicitly select password field
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return next(new AppError('Incorrect email or password', 401));
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Set refresh token cookie
    setRefreshTokenCookie(res, refreshToken);

    // Prepare user response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({
      status: 'success',
      token: accessToken,
      data: {
        user: userResponse
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh Access Token
 */
export const refresh = async (req, res, next) => {
  try {
    const refreshToken = getRefreshTokenFromReq(req);

    if (!refreshToken) {
      return next(new AppError('No refresh token provided', 401));
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    // Fetch user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    // Generate new Access Token
    const newAccessToken = generateAccessToken(user);

    res.status(200).json({
      status: 'success',
      token: newAccessToken
    });
  } catch (error) {
    // Wrap JWT errors to be unified 401s
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new AppError('Invalid or expired refresh token. Please login again.', 401));
    }
    next(error);
  }
};

/**
 * Logout user
 */
export const logout = (req, res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully'
  });
};

/**
 * Get current authenticated user
 */
export const getMe = (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      user: req.user
    }
  });
};
