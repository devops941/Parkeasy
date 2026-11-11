import { TokenService } from '../services/tokenService.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Middleware to authenticate requests using JWT Access Token
 */
export const authenticate = asyncHandler(async (req, res, next) => {
  let token = null;

  // Check Authorization header for Bearer token
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(AppError.unauthorized('Authentication required: Missing access token'));
  }

  let decoded;
  try {
    decoded = TokenService.verifyAccessToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(AppError.unauthorized('Access token has expired. Please refresh your session.'));
    }
    return next(AppError.unauthorized('Invalid access token'));
  }

  // Find user by ID
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(AppError.unauthorized('User associated with this token no longer exists'));
  }

  if (!currentUser.isActive) {
    return next(AppError.forbidden('Your account has been deactivated. Please contact support.'));
  }

  // Grant access
  req.user = currentUser;
  next();
});

/**
 * Middleware to authorize requests based on user roles
 * @param {...string} allowedRoles - e.g. 'admin', 'handler', 'user'
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        AppError.forbidden(
          `Access denied: Role '${req.user.role}' is not authorized to access this resource`
        )
      );
    }

    next();
  };
};

