import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthUser, AuthSession, SignUpParams, SignInParams } from '../types/auth';
import { authService } from '../services/authService';
import { useBookingStore } from './useBookingStore';

const memoryStorage = new Map<string, string>();

const safeAsyncStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      if (
        typeof window === 'undefined' &&
        typeof (globalThis as any).nativeCallSyncHook === 'undefined'
      ) {
        return memoryStorage.get(name) || null;
      }
      return await AsyncStorage.getItem(name);
    } catch {
      return memoryStorage.get(name) || null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      if (
        typeof window === 'undefined' &&
        typeof (globalThis as any).nativeCallSyncHook === 'undefined'
      ) {
        memoryStorage.set(name, value);
        return;
      }
      await AsyncStorage.setItem(name, value);
    } catch {
      memoryStorage.set(name, value);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      if (
        typeof window === 'undefined' &&
        typeof (globalThis as any).nativeCallSyncHook === 'undefined'
      ) {
        memoryStorage.delete(name);
        return;
      }
      await AsyncStorage.removeItem(name);
    } catch {
      memoryStorage.delete(name);
    }
  },
};

export interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (params: SignInParams) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (email?: string) => Promise<{ success: boolean; error?: string }>;
  register: (params: SignUpParams) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  switchDemoAccount: (student: {
    id: string;
    email: string;
    code: string;
    name: string;
    className?: string;
  }) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isLoading: false,
      isInitialized: false,
      error: null,

      initialize: async () => {
        set({ isLoading: true });
        try {
          // Listen to background auth state changes (e.g. Google OAuth redirect on web)
          authService.onAuthStateChange((newUser) => {
            if (newUser) {
              set({ user: newUser, isInitialized: true, isLoading: false, error: null });
              useBookingStore.getState().switchStudent({
                id: newUser.id,
                name: newUser.fullName,
                code: newUser.studentCode,
              });
            }
          });

          const delayPromise =
            typeof process !== 'undefined' && process.env?.NODE_ENV === 'test'
              ? Promise.resolve()
              : new Promise((resolve) => setTimeout(resolve, 600));
          const [session] = await Promise.all([
            authService.getSession(),
            delayPromise,
          ]);
          if (session?.user) {
            set({ user: session.user, session, isInitialized: true, isLoading: false });
            // Sync with useBookingStore
            useBookingStore.getState().switchStudent({
              id: session.user.id,
              name: session.user.fullName,
              code: session.user.studentCode,
            });
          } else {
            set({ user: null, session: null, isInitialized: true, isLoading: false });
          }
        } catch (e: any) {
          console.warn('Auth initialization error:', e);
          set({ isInitialized: true, isLoading: false });
        }
      },

      login: async (params: SignInParams) => {
        set({ isLoading: true, error: null });
        try {
          const res = await authService.signIn(params);
          if (res.success && res.user) {
            set({
              user: res.user,
              session: res.session || null,
              isLoading: false,
              error: null,
            });

            // Synchronize student identity with booking store
            useBookingStore.getState().switchStudent({
              id: res.user.id,
              name: res.user.fullName,
              code: res.user.studentCode,
            });

            return { success: true };
          } else {
            const errorMsg = res.error || 'Đăng nhập không thành công';
            set({ isLoading: false, error: errorMsg });
            return { success: false, error: errorMsg };
          }
        } catch (e: any) {
          const errorMsg = e?.message || 'Lỗi kết nối khi đăng nhập';
          set({ isLoading: false, error: errorMsg });
          return { success: false, error: errorMsg };
        }
      },

      loginWithGoogle: async (email?: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await authService.signInWithGoogle(email);
          if (res.success && res.user) {
            set({
              user: res.user,
              session: res.session || null,
              isLoading: false,
              error: null,
            });

            useBookingStore.getState().switchStudent({
              id: res.user.id,
              name: res.user.fullName,
              code: res.user.studentCode,
            });

            return { success: true };
          } else if (res.success && !res.user) {
            // Browser is redirecting to accounts.google.com
            set({ isLoading: false, error: null });
            return { success: true };
          } else {
            const errorMsg = res.error || 'Đăng nhập Google không thành công';
            set({ isLoading: false, error: errorMsg });
            return { success: false, error: errorMsg };
          }
        } catch (e: any) {
          const errorMsg = e?.message || 'Lỗi kết nối khi đăng nhập Google';
          set({ isLoading: false, error: errorMsg });
          return { success: false, error: errorMsg };
        }
      },

      register: async (params: SignUpParams) => {
        set({ isLoading: true, error: null });
        try {
          const res = await authService.signUp(params);
          if (res.success && res.user) {
            set({
              user: res.user,
              session: res.session || null,
              isLoading: false,
              error: null,
            });

            useBookingStore.getState().switchStudent({
              id: res.user.id,
              name: res.user.fullName,
              code: res.user.studentCode,
            });

            return { success: true };
          } else {
            const errorMsg = res.error || 'Đăng ký không thành công';
            set({ isLoading: false, error: errorMsg });
            return { success: false, error: errorMsg };
          }
        } catch (e: any) {
          const errorMsg = e?.message || 'Lỗi kết nối khi đăng ký';
          set({ isLoading: false, error: errorMsg });
          return { success: false, error: errorMsg };
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await authService.signOut();
        } catch (e) {
          console.warn('SignOut warning:', e);
        } finally {
          set({
            user: null,
            session: null,
            isLoading: false,
            error: null,
          });
          await useBookingStore.getState().clearAllStorageAndReset();
        }
      },

      switchDemoAccount: async (student) => {
        const newUser: AuthUser = {
          id: student.id,
          email: student.email,
          studentCode: student.code,
          fullName: student.name,
          className: student.className || 'VKU',
        };

        const newSession: AuthSession = {
          accessToken: `mock-jwt-token-${student.id}`,
          expiresAt: Date.now() + 7 * 24 * 3600 * 1000,
          user: newUser,
        };

        set({ user: newUser, session: newSession, error: null });

        useBookingStore.getState().switchStudent({
          id: student.id,
          name: student.name,
          code: student.code,
        });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'vku-auth-storage',
      storage: createJSONStorage(() => safeAsyncStorage),
      partialize: (state) => ({
        user: state.user,
        session: state.session,
      }),
    }
  )
);
