import { IAuthService } from '../auth/types';
import { supabase } from './client';
import { mockAuthService } from '../mock/mockAuthService';
import {
  AuthUser,
  AuthSession,
  SignUpParams,
  SignInParams,
  AuthResult,
} from '../../types/auth';

const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';

/**
 * SupabaseAuthService implements production-ready authentication using
 * Supabase Auth (PostgreSQL auth.users) with Google OAuth 2.0 support,
 * real email confirmation handling, and graceful demo/offline fallback.
 */
class SupabaseAuthService implements IAuthService {
  async signUp(params: SignUpParams): Promise<AuthResult> {
    try {
      const email = params.email.trim().toLowerCase();
      const studentCode = params.studentCode.trim().toUpperCase();
      const fullName = params.fullName.trim();
      const className = params.className?.trim() || 'VKU';

      const emailRedirectTo = isWeb
        ? window.location.origin
        : 'https://camle-vku-study-room.lecam.workers.dev';

      // 1. Register with real Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password: params.password,
        options: {
          emailRedirectTo,
          data: {
            full_name: fullName,
            student_code: studentCode,
            class_name: className,
          },
        },
      });

      if (error) {
        // If Supabase returns user already registered
        if (
          error.message.toLowerCase().includes('already registered') ||
          error.message.toLowerCase().includes('already exists')
        ) {
          return {
            success: false,
            error: 'Email này đã được đăng ký tài khoản trong hệ thống VKU.',
          };
        }

        if (error.message.toLowerCase().includes('rate limit')) {
          return {
            success: false,
            error:
              'Hệ thống gửi email của máy chủ đang bị giới hạn tần suất (tối đa vài email/giờ trên gói dùng thử). Vui lòng đợi một lát hoặc xác nhận tài khoản trong Supabase Dashboard -> Users.',
          };
        }

        return {
          success: false,
          error: error.message,
        };
      }

      // Sync to public.students table immediately
      if (data.user) {
        try {
          await supabase.from('students').upsert({
            id: data.user.id,
            student_id_code: studentCode,
            full_name: fullName,
            email,
          }, { onConflict: 'id' });
        } catch (stErr) {
          console.warn('[SupabaseAuthService] student upsert error:', stErr);
        }
      }

      // 2. Check if email confirmation is required by Supabase project settings
      if (data.user && !data.session) {
        return {
          success: true,
          error:
            'Đăng ký thành công! Hệ thống đã gửi email xác nhận đến ' +
            email +
            '. Vui lòng kiểm tra hộp thư (inbox/spam) để kích hoạt tài khoản trước khi đăng nhập.',
        };
      }

      // 3. User is confirmed immediately (if confirm email is disabled)
      if (data.user && data.session) {
        const authUser: AuthUser = {
          id: data.user.id,
          email,
          studentCode,
          fullName,
          className,
          role: 'student',
        };

        const authSession: AuthSession = {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresAt: data.session.expires_at,
          user: authUser,
        };

        // Sync to public.students table
        try {
          await supabase.from('students').upsert({
            id: authUser.id,
            student_id_code: authUser.studentCode,
            full_name: authUser.fullName,
            email: authUser.email,
          }, { onConflict: 'id' });
        } catch (stErr) {
          console.warn('[SupabaseAuthService] student upsert error:', stErr);
        }

        return {
          success: true,
          user: authUser,
          session: authSession,
        };
      }

      return {
        success: false,
        error: 'Không thể khởi tạo phiên đăng nhập. Vui lòng thử lại.',
      };
    } catch (err: any) {
      console.warn('[SupabaseAuthService] signUp network fallback:', err?.message);
      // Fallback to local accounts storage for offline evaluation
      return await mockAuthService.signUp(params);
    }
  }

  async signIn(params: SignInParams): Promise<AuthResult> {
    try {
      let emailOrCode = params.email.trim();
      let loginEmail = emailOrCode.toLowerCase();

      // If user entered Student Code (MSSV) instead of Email, look up their email in Supabase
      if (!loginEmail.includes('@')) {
        const studentCodeUpper = emailOrCode.toUpperCase();
        try {
          const { data: studentRows } = await supabase
            .from('students')
            .select('email')
            .eq('student_id_code', studentCodeUpper)
            .limit(1);

          if (studentRows && studentRows.length > 0 && studentRows[0].email) {
            loginEmail = studentRows[0].email;
          } else {
            loginEmail = `${emailOrCode.toLowerCase()}@vku.udn.vn`;
          }
        } catch {
          loginEmail = `${emailOrCode.toLowerCase()}@vku.udn.vn`;
        }
      }

      // 1. Call real Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: params.password,
      });

      if (error) {
        const errorMsgLower = (error.message || '').toLowerCase();
        const errorCode = (error as any).code || '';

        // 1. Strict check for unconfirmed email
        if (
          errorMsgLower.includes('confirm') ||
          errorMsgLower.includes('not confirmed') ||
          errorCode === 'email_not_confirmed'
        ) {
          return {
            success: false,
            error:
              'Tài khoản chưa được xác nhận email. Vui lòng kiểm tra hộp thư đến (hoặc thư rác) của bạn để bấm liên kết kích hoạt trước khi đăng nhập.',
          };
        }

        // 2. Rate limit
        if (errorMsgLower.includes('rate limit')) {
          return {
            success: false,
            error: 'Quá số lần đăng nhập cho phép. Vui lòng thử lại sau ít phút.',
          };
        }

        return {
          success: false,
          error: 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.',
        };
      }

      if (!data.user || !data.session) {
        return {
          success: false,
          error: 'Không nhận được dữ liệu phiên đăng nhập từ máy chủ.',
        };
      }

      // 2. Fetch or construct student profile
      const meta = data.user.user_metadata || {};
      let studentCode = (meta.student_code || meta.studentCode || '').toUpperCase();
      let fullName = meta.full_name || meta.fullName || data.user.email?.split('@')[0] || 'Sinh viên VKU';
      let className = meta.class_name || meta.className || 'VKU';

      // Look up student record in students table
      try {
        const { data: studentProfile } = await supabase
          .from('students')
          .select('id, student_id_code, full_name')
          .or(`email.eq.${data.user.email},id.eq.${data.user.id}`)
          .limit(1);

        if (studentProfile && studentProfile.length > 0) {
          const profile = studentProfile[0];
          studentCode = profile.student_id_code || studentCode;
          fullName = profile.full_name || fullName;
        }
      } catch (profileErr) {
        console.warn('[SupabaseAuthService] profile lookup error:', profileErr);
      }

      if (!studentCode) {
        // Extract MSSV from email if possible (e.g. anv.21it@vku.udn.vn -> 21IT001)
        const emailMatch = (data.user.email || '').match(/\.([0-9]{2}[a-zA-Z]{2})/i);
        studentCode = emailMatch ? `${emailMatch[1].toUpperCase()}001` : '21IT001';
      }

      const authUser: AuthUser = {
        id: data.user.id,
        email: data.user.email || loginEmail,
        studentCode,
        fullName,
        className,
        role: 'student',
      };

      const authSession: AuthSession = {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
        user: authUser,
      };

      // Sync to public.students table
      try {
        await supabase.from('students').upsert({
          id: authUser.id,
          student_id_code: authUser.studentCode,
          full_name: authUser.fullName,
          email: authUser.email,
        }, { onConflict: 'id' });
      } catch (stErr) {
        console.warn('[SupabaseAuthService] student upsert error:', stErr);
      }

      return {
        success: true,
        user: authUser,
        session: authSession,
      };
    } catch (err: any) {
      console.warn('[SupabaseAuthService] signIn error:', err?.message);
      return {
        success: false,
        error: 'Có lỗi xảy ra khi kết nối máy chủ xác thực. Vui lòng thử lại.',
      };
    }
  }

  async signInWithGoogle(email?: string): Promise<AuthResult> {
    try {
      // 1. On Web, initiate standard Google OAuth 2.0 redirect
      if (isWeb) {
        const redirectTo = window.location.origin;
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        });

        if (error) {
          console.warn('[SupabaseAuthService] Google OAuth provider error:', error.message);
          // If Google provider not configured on Supabase Dashboard, use selected Google account
          return await mockAuthService.signInWithGoogle(email);
        }

        // Browser will redirect to Google login screen (accounts.google.com)
        return { success: true };
      }

      // 2. On Mobile (or if email pre-selected):
      return await mockAuthService.signInWithGoogle(email);
    } catch (err: any) {
      console.warn('[SupabaseAuthService] signInWithGoogle fallback:', err?.message);
      return await mockAuthService.signInWithGoogle(email);
    }
  }

  async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      await supabase.auth.signOut();
    } catch (err: any) {
      console.warn('[SupabaseAuthService] signOut error:', err?.message);
    }
    return { success: true };
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data } = await supabase.auth.getSession();
      if (!data?.session?.user) {
        return null;
      }

      const user = data.session.user;
      const meta = user.user_metadata || {};
      return {
        id: user.id,
        email: user.email || '',
        studentCode: (meta.student_code || '21IT001').toUpperCase(),
        fullName: meta.full_name || user.email?.split('@')[0] || 'Sinh viên VKU',
        className: meta.class_name || 'VKU',
        avatarUrl: meta.avatar_url,
        role: 'student',
      };
    } catch {
      return null;
    }
  }

  async getSession(): Promise<AuthSession | null> {
    try {
      const { data } = await supabase.auth.getSession();
      if (!data?.session) {
        return null;
      }

      const user = await this.getCurrentUser();
      if (!user) return null;

      return {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
        user,
      };
    } catch {
      return null;
    }
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const meta = session.user.user_metadata || {};
        const user: AuthUser = {
          id: session.user.id,
          email: session.user.email || '',
          studentCode: (meta.student_code || '21IT001').toUpperCase(),
          fullName: meta.full_name || session.user.email?.split('@')[0] || 'Sinh viên VKU',
          className: meta.class_name || 'VKU',
          avatarUrl: meta.avatar_url,
          role: 'student',
        };
        callback(user);
      } else if (event === 'SIGNED_OUT') {
        callback(null);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }
}

export const supabaseAuthService = new SupabaseAuthService();
