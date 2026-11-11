import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export class TokenService {
  /**
   * Generate an Access Token for authenticated user
   * @param {{ _id: string, role: string, email: string }} user
   * @returns {string} JWT access token
   */
  static generateAccessToken(user) {
    return jwt.sign(
      {
        id: user._id.toString(),
        role: user.role,
        email: user.email,
      },
      config.jwt.accessSecret,
      { expiresIn: config.jwt.accessExpiresIn }
    );
  }

  /**
   * Generate a Refresh Token
   * @param {{ _id: string }} user
   * @returns {string} JWT refresh token
   */
  static generateRefreshToken(user) {
    return jwt.sign(
      {
        id: user._id.toString(),
      },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );
  }

  /**
   * Verify an Access Token
   * @param {string} token
   * @returns {object} Decoded payload
   */
  static verifyAccessToken(token) {
    return jwt.verify(token, config.jwt.accessSecret);
  }

  /**
   * Verify a Refresh Token
   * @param {string} token
   * @returns {object} Decoded payload
   */
  static verifyRefreshToken(token) {
    return jwt.verify(token, config.jwt.refreshSecret);
  }

  /**
   * Generate signed short QR token
   * @param {object} payload - e.g. { userId, purpose: 'profile' } or { bookingId, purpose: 'ticket' }
   * @param {string} expiresIn - e.g. '15m' or '24h'
   * @returns {string}
   */
  static generateQRToken(payload, expiresIn = '30m') {
    return jwt.sign(payload, config.jwt.qrSecret, { expiresIn });
  }

  /**
   * Verify signed short QR token
   * @param {string} token
   * @returns {object} Decoded payload
   */
  static verifyQRToken(token) {
    return jwt.verify(token, config.jwt.qrSecret);
  }
}

