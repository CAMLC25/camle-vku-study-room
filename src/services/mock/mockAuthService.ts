import AsyncStorage from '@react-native-async-storage/async-storage';
import { IAuthService } from '../auth/types';
import {
  AuthUser,
  AuthSession,
  SignUpParams,
  SignInParams,
  AuthResult,
} from '../../types/auth';

interface StoredMockUser {
  user: AuthUser;
  passwordHash: string;
}

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

const STORAGE_KEY_USERS = '@vku_registered_users';
const STORAGE_KEY_SESSION = '@vku_current_session';

// Pre-seeded VKU students matching Supabase students database
const INITIAL_MOCK_USERS: StoredMockUser[] = [
  {
    user: {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'anv.21it@vku.udn.vn',
      studentCode: '21IT001',
      fullName: 'Nguyễn Văn A',
      className: '21IT1',
    },
    passwordHash: '123456',
  },
  {
    user: {
      id: '00000000-0000-0000-0000-000000000002',
      email: 'btt.21it@vku.udn.vn',
      studentCode: '21IT002',
      fullName: 'Trần Thị B',
      className: '21IT2',
    },
    passwordHash: '123456',
  },
  {
    user: {
      id: '00000000-0000-0000-0000-000000000003',
      email: 'clv.21it@vku.udn.vn',
      studentCode: '21IT003',
      fullName: 'Lê Văn C',
      className: '21IT3',
    },
    passwordHash: '123456',
  },
];

class MockAuthService implements IAuthService {
  private users: StoredMockUser[] = [...INITIAL_MOCK_USERS];
  private currentSession: AuthSession | null = null;
  private listeners: Set<(user: AuthUser | null) => void> = new Set();
  private isLoadedFromStorage = false;

  constructor() {
    this.loadFromStorage();
  }

  private async loadFromStorage() {
    try {
      const storedUsersJson = await safeAsyncStorage.getItem(STORAGE_KEY_USERS);
      if (storedUsersJson) {
        const parsed = JSON.parse(storedUsersJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge initial and stored users without duplicates
          const userMap = new Map<string, StoredMockUser>();
          INITIAL_MOCK_USERS.forEach((u) => userMap.set(u.user.email.toLowerCase(), u));
          parsed.forEach((u: StoredMockUser) => {
            if (u?.user?.email) {
              userMap.set(u.user.email.toLowerCase(), u);
            }
          });
          this.users = Array.from(userMap.values());
        }
      }

      const storedSessionJson = await safeAsyncStorage.getItem(STORAGE_KEY_SESSION);
      if (storedSessionJson) {
        const session: AuthSession = JSON.parse(storedSessionJson);
        if (session?.user && (!session.expiresAt || session.expiresAt > Date.now())) {
          this.currentSession = session;
        }
      }
    } catch (e) {
      console.warn('Error loading mock auth storage:', e);
    } finally {
      this.isLoadedFromStorage = true;
    }
  }

  private async saveUsersToStorage() {
    try {
      await safeAsyncStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(this.users));
    } catch (e) {
      console.warn('Error saving mock users to storage:', e);
    }
  }

  private async saveSessionToStorage(session: AuthSession | null) {
    try {
      if (session) {
        await safeAsyncStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
      } else {
        await safeAsyncStorage.removeItem(STORAGE_KEY_SESSION);
      }
    } catch (e) {
      console.warn('Error saving mock session to storage:', e);
    }
  }

  private notify() {
    const user = this.currentSession?.user || null;
    this.listeners.forEach((listener) => {
      try {
        listener(user);
      } catch (err) {
        console.warn('Auth listener error:', err);
      }
    });
  }

  async signUp(params: SignUpParams): Promise<AuthResult> {
    if (!this.isLoadedFromStorage) {
      await this.loadFromStorage();
    }

    const email = params.email.trim().toLowerCase();
    if (!email) {
      return { success: false, error: 'Email không được để trống' };
    }

    if (!email.includes('@')) {
      return { success: false, error: 'Định dạng email không hợp lệ' };
    }

    if (!params.password || params.password.length < 6) {
      return { success: false, error: 'Mật khẩu phải có ít nhất 6 ký tự' };
    }

    const studentCode = params.studentCode.trim().toUpperCase();
    if (!studentCode) {
      return { success: false, error: 'Mã số sinh viên không được để trống' };
    }

    const fullName = params.fullName.trim();
    if (!fullName) {
      return { success: false, error: 'Họ và tên không được để trống' };
    }

    const existingUser = this.users.find(
      (u) =>
        u.user.email.toLowerCase() === email ||
        u.user.studentCode.toUpperCase() === studentCode
    );

    if (existingUser) {
      return {
        success: false,
        error: 'Email hoặc mã số sinh viên này đã được đăng ký trong hệ thống',
      };
    }

    // Determine compatible database student ID for Supabase bookings
    let studentId = '00000000-0000-0000-0000-000000000001';
    if (studentCode === '21IT001') {
      studentId = '00000000-0000-0000-0000-000000000001';
    } else if (studentCode === '21IT002') {
      studentId = '00000000-0000-0000-0000-000000000002';
    } else if (studentCode === '21IT003') {
      studentId = '00000000-0000-0000-0000-000000000003';
    } else {
      // Deterministically map to one of the 3 database slots (1, 2, or 3) so that
      // Supabase RPC book_slot will never reject with foreign key STUDENT_NOT_FOUND
      const codeHash = Array.from(studentCode).reduce(
        (acc, c) => acc + c.charCodeAt(0),
        0
      );
      const slot = (codeHash % 3) + 1;
      studentId = `00000000-0000-0000-0000-00000000000${slot}`;
    }

    const newUser: AuthUser = {
      id: studentId,
      email,
      studentCode,
      fullName,
      className: params.className?.trim() || 'VKU',
    };

    const newRecord: StoredMockUser = {
      user: newUser,
      passwordHash: params.password,
    };

    this.users.push(newRecord);
    await this.saveUsersToStorage();

    const session: AuthSession = {
      accessToken: `vku-jwt-${studentId}-${Date.now()}`,
      expiresAt: Date.now() + 14 * 24 * 3600 * 1000,
      user: newUser,
    };

    this.currentSession = session;
    await this.saveSessionToStorage(session);
    this.notify();

    // Instant registration: no email confirmation needed!
    return { success: true, user: newUser, session };
  }

  async signIn(params: SignInParams): Promise<AuthResult> {
    if (!this.isLoadedFromStorage) {
      await this.loadFromStorage();
    }

    const input = params.email.trim().toLowerCase();
    if (!input) {
      return { success: false, error: 'Vui lòng nhập email hoặc mã số sinh viên' };
    }

    // Match by email OR by student code (MSSV)
    const stored = this.users.find(
      (u) =>
        u.user.email.toLowerCase() === input ||
        u.user.studentCode.toLowerCase() === input
    );

    if (!stored) {
      return {
        success: false,
        error: 'Tài khoản không tồn tại. Vui lòng kiểm tra lại email hoặc mã số sinh viên.',
      };
    }

    // For demo accounts, accept either '123456' or 'password123' or their stored password
    const isPasswordValid =
      stored.passwordHash === params.password ||
      (stored.user.studentCode.startsWith('21IT00') &&
        (params.password === '123456' || params.password === 'password123'));

    if (!isPasswordValid) {
      return {
        success: false,
        error: 'Mật khẩu không chính xác.',
      };
    }

    const session: AuthSession = {
      accessToken: `vku-jwt-${stored.user.id}-${Date.now()}`,
      expiresAt: Date.now() + 14 * 24 * 3600 * 1000,
      user: stored.user,
    };

    this.currentSession = session;
    await this.saveSessionToStorage(session);
    this.notify();

    return { success: true, user: stored.user, session };
  }

  async signOut(): Promise<{ success: boolean; error?: string }> {
    this.currentSession = null;
    await this.saveSessionToStorage(null);
    this.notify();
    return { success: true };
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    if (!this.isLoadedFromStorage) {
      await this.loadFromStorage();
    }
    return this.currentSession?.user || null;
  }

  async getSession(): Promise<AuthSession | null> {
    if (!this.isLoadedFromStorage) {
      await this.loadFromStorage();
    }
    return this.currentSession;
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  setMockSession(user: AuthUser) {
    this.currentSession = {
      accessToken: `vku-jwt-${user.id}-${Date.now()}`,
      expiresAt: Date.now() + 14 * 24 * 3600 * 1000,
      user,
    };
    this.saveSessionToStorage(this.currentSession);
    this.notify();
  }

  getRegisteredMockUsers(): AuthUser[] {
    return this.users.map((u) => u.user);
  }
}

export const mockAuthService = new MockAuthService();
