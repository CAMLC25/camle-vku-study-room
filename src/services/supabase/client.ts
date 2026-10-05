import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV } from '../../config/environment';

const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';
const memoryStorage = new Map<string, string>();

const safeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (typeof window === 'undefined' && typeof (globalThis as any).nativeCallSyncHook === 'undefined') {
        return memoryStorage.get(key) || null;
      }
      return await AsyncStorage.getItem(key);
    } catch {
      return memoryStorage.get(key) || null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (typeof window === 'undefined' && typeof (globalThis as any).nativeCallSyncHook === 'undefined') {
        memoryStorage.set(key, value);
        return;
      }
      await AsyncStorage.setItem(key, value);
    } catch {
      memoryStorage.set(key, value);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (typeof window === 'undefined' && typeof (globalThis as any).nativeCallSyncHook === 'undefined') {
        memoryStorage.delete(key);
        return;
      }
      await AsyncStorage.removeItem(key);
    } catch {
      memoryStorage.delete(key);
    }
  },
};

export const supabase = createClient(
  ENV.supabaseUrl,
  ENV.supabaseAnonKey,
  {
    auth: {
      storage: safeStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: isWeb,
    },
  }
);
