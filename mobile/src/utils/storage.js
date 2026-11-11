import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const webMemoryStorage = new Map();

export const storage = {
  async setItem(key, value) {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        } else {
          webMemoryStorage.set(key, value);
        }
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.warn(`[Storage] Failed to save key "${key}":`, e.message);
    }
  },

  async getItem(key) {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return webMemoryStorage.get(key) || null;
      }
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.warn(`[Storage] Failed to get key "${key}":`, e.message);
      return null;
    }
  },

  async removeItem(key) {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        } else {
          webMemoryStorage.delete(key);
        }
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.warn(`[Storage] Failed to delete key "${key}":`, e.message);
    }
  },
};

