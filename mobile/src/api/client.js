import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { storage } from '../utils/storage.js';

export const PRODUCTION_API_URL = 'https://parkeasy-7qe2.onrender.com/api/v1';

/**
 * Ensures user-entered or env API URLs include the /api/v1 base path.
 */
export const normalizeApiBaseUrl = (rawUrl) => {
  if (typeof rawUrl !== 'string') return '';
  const cleaned = rawUrl.trim().replace(/\/+$/, '');
  if (!cleaned) return '';
  try {
    const parsed = new URL(cleaned);
    if (!parsed.pathname || parsed.pathname === '/') {
      return `${cleaned}/api/v1`;
    }
  } catch (_) {}
  return cleaned;
};

// Auto-detect computer's local network IP from Expo bundler
export const getAutoDetectedUrl = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.manifest?.debuggerHost;

  if (hostUri) {
    const hostIp = hostUri.split(':')[0];
    return `http://${hostIp}:5000/api/v1`;
  }

  if (Platform.OS === 'web') {
    return normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api/v1');
  }

  // Fallback to env override or hosted Render API for standalone APK builds
  return normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_URL || PRODUCTION_API_URL);
};

export const DEFAULT_API_URL = getAutoDetectedUrl();

const PRIVATE_LAN_RE = /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?(\/|$)/i;

/**
 * Returns true if the URL targets localhost or a private RFC1918 LAN IP.
 */
export const isPrivateLanUrl = (url) =>
  typeof url === 'string' && PRIVATE_LAN_RE.test(url.trim());

/**
 * Resolves the effective API base URL, discarding stale cached LAN overrides
 * when Expo auto-detects a live LAN address on the current network.
 */
export const resolveEffectiveApiUrl = async () => {
  const customUrl = await storage.getItem('customApiUrl');
  if (customUrl) {
    const normalizedCustom = normalizeApiBaseUrl(customUrl);
    if (
      DEFAULT_API_URL &&
      isPrivateLanUrl(DEFAULT_API_URL) &&
      isPrivateLanUrl(normalizedCustom) &&
      normalizedCustom !== DEFAULT_API_URL.trim()
    ) {
      await storage.removeItem('customApiUrl');
      apiClient.defaults.baseURL = DEFAULT_API_URL;
      return DEFAULT_API_URL;
    }
    if (normalizedCustom !== customUrl) {
      await storage.setItem('customApiUrl', normalizedCustom);
    }
    apiClient.defaults.baseURL = normalizedCustom;
    return normalizedCustom;
  }
  apiClient.defaults.baseURL = DEFAULT_API_URL || undefined;
  return DEFAULT_API_URL;
};

export const apiClient = axios.create({
  baseURL: DEFAULT_API_URL || undefined,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Update base URL dynamically if user customizes it
export const setApiBaseUrl = (newUrl) => {
  apiClient.defaults.baseURL = newUrl;
};

// Request interceptor: resolve effective URL and attach Bearer access token
apiClient.interceptors.request.use(
  async (config) => {
    const effectiveUrl = await resolveEffectiveApiUrl();
    if (effectiveUrl) {
      config.baseURL = effectiveUrl;
    }

    const token = await storage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: auto-refresh on 401 token expiration
let isRefreshing = false;
let failedQueue = [];
let sessionExpiredHandler = null;

export const setSessionExpiredHandler = (handler) => {
  sessionExpiredHandler = handler;
};

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Detailed error logging for easy debugging on mobile
    if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
      console.warn(
        `[Network Error] Could not connect to backend at ${originalRequest?.baseURL || apiClient.defaults.baseURL}. Ensure the backend server is running on port 5000.`
      );
    }

    // If 401 and not already retrying
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/register') &&
      !originalRequest.url?.includes('/auth/refresh-token')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const storedRefreshToken = await storage.getItem('refreshToken');
        if (!storedRefreshToken) {
          throw new Error('No refresh token available');
        }

        const res = await axios.post(`${originalRequest.baseURL || apiClient.defaults.baseURL}/auth/refresh-token`, {
          refreshToken: storedRefreshToken,
        });

        const { accessToken, refreshToken } = res.data.data;

        await storage.setItem('accessToken', accessToken);
        if (refreshToken) {
          await storage.setItem('refreshToken', refreshToken);
        }

        apiClient.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        processQueue(null, accessToken);
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        await storage.removeItem('accessToken');
        await storage.removeItem('refreshToken');
        await storage.removeItem('user');
        if (sessionExpiredHandler) {
          sessionExpiredHandler();
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
