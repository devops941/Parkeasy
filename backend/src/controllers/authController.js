import crypto from 'crypto';
import { User } from '../models/User.js';
import { TokenService } from '../services/tokenService.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const register = asyncHandler(async (req, res, next) => {
  const { name, email, phone, password, vehicleNumber } = req.body;

  // Check if user with this email already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(AppError.conflict('An account with this email address already exists'));
  }

  // Hash password
  const passwordHash = await User.hashPassword(password);

  // Create new user (always role 'user' from public registration)
  const newUser = await User.create({
    name,
    email,
    phone,
    passwordHash,
    role: 'user',
    vehicleNumber: vehicleNumber || null,
    walletBalance: 0,
    isActive: true,
  });

  // Generate tokens
  const accessToken = TokenService.generateAccessToken(newUser);
  const refreshToken = TokenService.generateRefreshToken(newUser);

  // Store refresh token
  newUser.refreshToken = refreshToken;
  await newUser.save({ validateModifiedOnly: true });

  return ApiResponse.created(res, 'User registered successfully', {
    user: newUser,
    accessToken,
    refreshToken,
  });
});

export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Find user by email including passwordHash & refreshToken
  const user = await User.findOne({ email }).select('+passwordHash +refreshToken');
  if (!user) {
    return next(AppError.unauthorized('Invalid email or password'));
  }

  // Check password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return next(AppError.unauthorized('Invalid email or password'));
  }

  // Check active status
  if (!user.isActive) {
    return next(AppError.forbidden('Your account has been deactivated. Please contact support.'));
  }

  // Generate tokens
  const accessToken = TokenService.generateAccessToken(user);
  const refreshToken = TokenService.generateRefreshToken(user);

  // Save refresh token
  user.refreshToken = refreshToken;
  await user.save({ validateModifiedOnly: true });

  return ApiResponse.success(res, 'Logged in successfully', {
    user,
    accessToken,
    refreshToken,
  });
});

export const refreshToken = asyncHandler(async (req, res, next) => {
  const { refreshToken: incomingToken } = req.body;

  let decoded;
  try {
    decoded = TokenService.verifyRefreshToken(incomingToken);
  } catch (err) {
    return next(AppError.unauthorized('Invalid or expired refresh token. Please log in again.'));
  }

  // Find user by id including stored refreshToken
  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || !user.isActive) {
    return next(AppError.unauthorized('User not found or account deactivated'));
  }

  // Verify that incoming token matches stored token
  if (user.refreshToken !== incomingToken) {
    // Possible token reuse attempt: invalidate token
    user.refreshToken = null;
    await user.save({ validateModifiedOnly: true });
    return next(AppError.unauthorized('Invalid refresh token. Session invalidated.'));
  }

  // Rotate tokens
  const newAccessToken = TokenService.generateAccessToken(user);
  const newRefreshToken = TokenService.generateRefreshToken(user);

  user.refreshToken = newRefreshToken;
  await user.save({ validateModifiedOnly: true });

  return ApiResponse.success(res, 'Token refreshed successfully', {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  });
});

export const logout = asyncHandler(async (req, res) => {
  // Clear stored refresh token for the authenticated user
  await User.findByIdAndUpdate(req.user._id, { refreshToken: null });

  return ApiResponse.success(res, 'Logged out successfully');
});

export const changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  // Fetch user with passwordHash
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!user) {
    return next(AppError.notFound('User not found'));
  }

  // Verify current password
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return next(AppError.badRequest('Current password does not match'));
  }

  // Hash new password and update
  user.passwordHash = await User.hashPassword(newPassword);
  user.refreshToken = null; // Revoke existing refresh token session
  await user.save();

  return ApiResponse.success(res, 'Password changed successfully. Please log in again.');
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (user && user.isActive) {
    // Generate reset token and set expiry
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateModifiedOnly: true });

    // In development mode, log the reset URL to console for local testing
    if (config.env === 'development') {
      const resetUrl = `http://localhost:5000/api/v1/auth/reset-password?token=${resetToken}`;
      console.log('\n========================================');
      console.log(`[PASSWORD RESET REQUEST] for email: ${user.email}`);
      console.log(`[RESET TOKEN]: ${resetToken}`);
      console.log(`[RESET URL]: ${resetUrl}`);
      console.log('========================================\n');
    }
  }

  // Always return identical message to prevent user enumeration
  return ApiResponse.success(
    res,
    'If an account with that email exists, password reset instructions have been generated.'
  );
});

export const resetPassword = asyncHandler(async (req, res, next) => {
  const { token, newPassword } = req.body;

  // Hash the incoming token with SHA256 to match DB stored hash
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(AppError.badRequest('Password reset token is invalid or has expired'));
  }

  // Update password and clear reset tokens
  user.passwordHash = await User.hashPassword(newPassword);
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  user.refreshToken = null; // Clear old sessions
  await user.save();

  return ApiResponse.success(res, 'Password has been successfully reset. You can now log in.');
});

export const getMe = asyncHandler(async (req, res) => {
  // Returns currently authenticated user
  return ApiResponse.success(res, 'User profile fetched successfully', {
    user: req.user,
  });
});

