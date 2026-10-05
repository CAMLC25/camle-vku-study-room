import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { SafeScreen } from '../components/layout/SafeScreen';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from '../store/useLanguageStore';
import { colors, layout, spacing, typography, shadows } from '../theme/theme';
import { GoogleIcon } from '../components/icons/GoogleIcon';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { t, language, setLanguage } = useTranslation();
  const login = useAuthStore((state) => state.login);
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const isLoading = useAuthStore((state) => state.isLoading);
  const authError = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLocalError(null);
    clearError();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setLocalError(t('fillAllFields'));
      return;
    }

    if (!password) {
      setLocalError(t('fillAllFields'));
      return;
    }

    const res = await login({ email: trimmedEmail, password });
    if (!res.success && !res.error) {
      setLocalError(t('errUnknown'));
    }
  };

  const handleGoogleSelect = async () => {
    setLocalError(
      language === 'vi'
        ? 'Tính năng Google OAuth chưa được kích hoạt trên Supabase. Bạn vui lòng sử dụng Email để Đăng nhập hoặc bấm Đăng ký ngay bên dưới.'
        : 'Google OAuth is not enabled on Supabase. Please sign in with your email or register an account below.'
    );
  };

  const displayError = localError || authError;

  return (
    <SafeScreen
      edges={['top', 'bottom', 'left', 'right']}
      backgroundColor="#0c4a6e"
      statusBarStyle="light"
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Header Bar with VKU Branding & Language Switcher */}
        <View style={styles.topHeader}>
          <View style={styles.topHeaderInner}>
            <View style={styles.headerBrandCol}>
              <View style={styles.vkuMiniBadge}>
                <Text style={styles.vkuMiniText}>VKU SMART CAMPUS</Text>
              </View>
              <Text style={styles.vkuTitle}>
                {language === 'vi'
                  ? 'ĐẠI HỌC CNTT & TRUYỀN THÔNG VIỆT - HÀN'
                  : 'VIETNAM - KOREA UNIVERSITY OF ICT'}
              </Text>
            </View>

            <View style={styles.langPillWrapper}>
              <TouchableOpacity
                style={[styles.langPillBtn, language === 'vi' && styles.langPillActive]}
                onPress={() => setLanguage('vi')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Tiếng Việt"
              >
                <Text style={[styles.langPillText, language === 'vi' && styles.langPillTextActive]}>
                  VN
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.langPillBtn, language === 'en' && styles.langPillActive]}
                onPress={() => setLanguage('en')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="English"
              >
                <Text style={[styles.langPillText, language === 'en' && styles.langPillTextActive]}>
                  EN
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Main Card */}
          <View style={styles.formCard}>
            {/* Header Title inside Card */}
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconEmoji}>🏛️</Text>
              </View>
              <Text style={styles.title} accessibilityRole="header">
                {t('loginTitle')}
              </Text>
              <Text style={styles.subtitle}>
                {language === 'vi'
                  ? 'Cổng thông tin mượn phòng học sinh viên VKU'
                  : 'VKU Student Study Room Booking Portal'}
              </Text>
            </View>

            {/* Error Banner */}
            {displayError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{displayError}</Text>
              </View>
            )}

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('emailLabel')}</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputPrefixIcon}>📧</Text>
                <TextInput
                  style={styles.textInput}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (displayError) clearError();
                  }}
                  placeholder={
                    language === 'vi'
                      ? 'Nhập Email hoặc Mã sinh viên (VD: 21IT001)'
                      : 'Enter Email or Student ID (e.g. 21IT001)'
                  }
                  placeholderTextColor="#94a3b8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('passwordLabel')}</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputPrefixIcon}>🔒</Text>
                <TextInput
                  style={styles.textInput}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (displayError) clearError();
                  }}
                  placeholder={
                    language === 'vi' ? 'Nhập mật khẩu tài khoản' : 'Enter your password'
                  }
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword((prev) => !prev)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Text style={styles.eyeText}>{showPassword ? '👁️' : '🙈'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('loginBtn')}
            >
              {isLoading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.loginButtonText}>{t('loginInProgress')}</Text>
                </View>
              ) : (
                <Text style={styles.loginButtonText}>{t('loginBtn')}</Text>
              )}
            </TouchableOpacity>

            {/* Divider OR */}
            <View style={styles.orDividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.orText}>{t('orDivider')}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Sign-In Button */}
            <TouchableOpacity
              style={[styles.googleButton, isLoading && styles.buttonDisabled]}
              onPress={() => handleGoogleSelect()}
              disabled={isLoading}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('loginWithGoogle')}
            >
              <View style={styles.googleIconContainer}>
                <GoogleIcon size={18} />
              </View>
              <Text style={styles.googleButtonText}>{t('loginWithGoogle')}</Text>
            </TouchableOpacity>

            {/* Register Navigation Link */}
            <View style={styles.switchAuthRow}>
              <Text style={styles.switchAuthText}>{t('noAccountPrompt')} </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Register')}
                disabled={isLoading}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
              >
                <Text style={styles.switchAuthLink}>{t('registerNow')}</Text>
              </TouchableOpacity>
            </View>

            {/* Campus Feature Highlights Inside Card */}
            <View style={styles.featureHighlights}>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>⚡</Text>
                <Text style={styles.featureText}>
                  {language === 'vi' ? 'Giữ chỗ 90s tức thì' : 'Instant 90s Hold'}
                </Text>
              </View>
              <View style={styles.featureDivider} />
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>🛡️</Text>
                <Text style={styles.featureText}>
                  {language === 'vi' ? 'Chuẩn hạn mức SV' : 'Standard Quotas'}
                </Text>
              </View>
              <View style={styles.featureDivider} />
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>📱</Text>
                <Text style={styles.featureText}>
                  {language === 'vi' ? 'Thẻ mượn QR Code' : 'QR Check-in Pass'}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  topHeader: {
    backgroundColor: '#0c4a6e',
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  topHeaderInner: {
    maxWidth: 1040,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerBrandCol: {
    flex: 1,
  },
  vkuMiniBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  vkuMiniText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#38bdf8',
    letterSpacing: 0.8,
  },
  vkuTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: 0.4,
  },
  langPillWrapper: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 3,
    gap: 3,
  },
  langPillBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  langPillActive: {
    backgroundColor: '#ffffff',
  },
  langPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  langPillTextActive: {
    color: '#0c4a6e',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.lg,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
    justifyContent: 'center',
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#e0f2fe',
    borderWidth: 2,
    borderColor: '#bae6fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    ...shadows.subtle,
  },
  iconEmoji: {
    fontSize: 34,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow:
          '0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
      } as any,
    }),
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bookedBg,
    borderWidth: 1,
    borderColor: colors.bookedBorder,
    padding: spacing.sm,
    borderRadius: layout.radii.sm,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  errorIcon: {
    fontSize: 14,
  },
  errorText: {
    fontSize: typography.sizes.xs,
    color: colors.bookedText,
    flex: 1,
    fontWeight: typography.weights.medium,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: layout.radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm + 2,
    minHeight: layout.buttonHeight,
  },
  inputPrefixIcon: {
    fontSize: 15,
    marginRight: spacing.xs,
  },
  textInput: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
  },
  eyeButton: {
    padding: spacing.xs,
  },
  eyeText: {
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: colors.primary,
    minHeight: layout.buttonHeight,
    borderRadius: layout.radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xs,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  orDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  orText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.textLight,
    paddingHorizontal: spacing.sm,
    letterSpacing: 1,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: layout.buttonHeight,
    borderRadius: layout.radii.md,
    ...shadows.subtle,
  },
  googleIconContainer: {
    marginRight: spacing.sm,
  },
  googleButtonText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loginButtonText: {
    color: colors.textInverse,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
  },
  switchAuthRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  switchAuthText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  switchAuthLink: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  featureHighlights: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  featureItem: {
    alignItems: 'center',
    flex: 1,
  },
  featureIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  featureText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    textAlign: 'center',
  },
  featureDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#e2e8f0',
  },
});
