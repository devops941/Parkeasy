import { create } from 'zustand';
import { apiClient, setSessionExpiredHandler } from '../api/client.js';
import { storage } from '../utils/storage.js';
import { connectSocket, disconnectSocket } from '../utils/socket.js';

export const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  role: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  clearError: () => set({ error: null }),

  /**
   * Check local storage on app start to restore session
   */
  checkAuth: async () => {
    try {
      set({ isLoading: true });
      const [accessToken, refreshToken, storedUserStr] = await Promise.all([
        storage.getItem('accessToken'),
        storage.getItem('refreshToken'),
        storage.getItem('user'),
      ]);

      if (!accessToken || !refreshToken) {
        set({ user: null, role: null, accessToken: null, refreshToken: null, isInitialized: true, isLoading: false });
        return;
      }

      // If stored user exists, preload it immediately to prevent screen flickers
      let cachedUser = null;
      if (storedUserStr) {
        try {
          cachedUser = JSON.parse(storedUserStr);
          set({ user: cachedUser, role: cachedUser.role, accessToken, refreshToken });
        } catch (e) {}
      }

      // Verify and fetch fresh user profile from backend
      try {
        const res = await apiClient.get('/auth/me');
        const freshUser = res.data.data.user;
        await storage.setItem('user', JSON.stringify(freshUser));
        set({
          user: freshUser,
          role: freshUser.role,
          accessToken,
          refreshToken,
          isInitialized: true,
          isLoading: false,
        });
        connectSocket(accessToken);
      } catch (err) {
        // If /auth/me failed (e.g. invalid token and refresh also failed)
        await storage.removeItem('accessToken');
        await storage.removeItem('refreshToken');
        await storage.removeItem('user');
        set({ user: null, role: null, accessToken: null, refreshToken: null, isInitialized: true, isLoading: false });
      }
    } catch (e) {
      set({ user: null, role: null, isInitialized: true, isLoading: false });
    }
  },

  /**
   * User, Handler or Admin Login
   */
  login: async (email, password) => {
    try {
      set({ isLoading: true, error: null });
      const res = await apiClient.post('/auth/login', { email, password });
      const { user, accessToken, refreshToken } = res.data.data;

      await Promise.all([
        storage.setItem('accessToken', accessToken),
        storage.setItem('refreshToken', refreshToken),
        storage.setItem('user', JSON.stringify(user)),
      ]);

      set({
        user,
        role: user.role,
        accessToken,
        refreshToken,
        isLoading: false,
        error: null,
      });

      connectSocket(accessToken);
      return { success: true, role: user.role };
    } catch (err) {
      let message = err.response?.data?.message || err.message || 'Login failed';
      if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
        const url = err.config?.baseURL || apiClient.defaults.baseURL;
        if (!url) {
          message = 'No server URL configured. Tap the "Server" pill at the bottom of the login screen to set your API URL.';
        } else {
          message = `Cannot reach server at ${url}. Tap the "Server" pill on the login screen to update the URL, and ensure your backend is running on the same network.`;
        }
      }
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  /**
   * Register new car owner
   */
  register: async ({ name, email, phone, password, vehicleNumber }) => {
    try {
      set({ isLoading: true, error: null });
      const res = await apiClient.post('/auth/register', {
        name,
        email,
        phone,
        password,
        vehicleNumber: vehicleNumber || undefined,
      });

      const { user, accessToken, refreshToken } = res.data.data;

      await Promise.all([
        storage.setItem('accessToken', accessToken),
        storage.setItem('refreshToken', refreshToken),
        storage.setItem('user', JSON.stringify(user)),
      ]);

      set({
        user,
        role: user.role,
        accessToken,
        refreshToken,
        isLoading: false,
        error: null,
      });

      return { success: true };
    } catch (err) {
      let message =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.message ||
        'Registration failed. Please try again.';
      if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
        const url = err.config?.baseURL || apiClient.defaults.baseURL;
        message = url
          ? `Cannot reach server at ${url}. Check your Server URL on the login screen and ensure the backend is running.`
          : 'No server URL configured. Set your API URL on the login screen first.';
      }
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  /**
   * Change Password
   */
  changePassword: async (currentPassword, newPassword) => {
    try {
      set({ isLoading: true, error: null });
      const res = await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      set({ isLoading: false });
      return { success: true, message: res.data.message };
    } catch (err) {
      const message =
        err.response?.data?.message || 'Failed to change password. Please verify current password.';
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  /**
   * Forgot Password - request reset instructions
   */
  forgotPassword: async (email) => {
    try {
      set({ isLoading: true, error: null });
      const res = await apiClient.post('/auth/forgot-password', { email });
      set({ isLoading: false });
      return { success: true, message: res.data.message };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to send reset link.';
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  /**
   * Logout
   */
  logout: async () => {
    disconnectSocket();
    try {
      await apiClient.post('/auth/logout').catch(() => {});
    } finally {
      await Promise.all([
        storage.removeItem('accessToken'),
        storage.removeItem('refreshToken'),
        storage.removeItem('user'),
      ]);
      set({
        user: null,
        role: null,
        accessToken: null,
        refreshToken: null,
        error: null,
      });
    }
  },

  /**
   * Update user locally (e.g. after wallet recharge)
   */
  updateUser: async (partialUser) => {
    const updated = { ...get().user, ...partialUser };
    await storage.setItem('user', JSON.stringify(updated));
    set({ user: updated });
  },
}));

// Automatically reset state when apiClient detects expired/invalid tokens
setSessionExpiredHandler(() => {
  useAuthStore.getState().logout();
});

