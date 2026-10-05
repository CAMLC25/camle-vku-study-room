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
      backgroundColor={colors.surface}
      statusBarStyle="dark"
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar with Language Selector */}
          <View style={styles.topBar}>
            <View style={styles.vkuMiniBadge}>
              <Text style={styles.vkuMiniText}>VKU SMART CAMPUS</Text>
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

          {/* Header Title & Branding */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>🏛️</Text>
            </View>
            <Text style={styles.title} accessibilityRole="header">
              {t('loginTitle')}
            </Text>
            <Text style={styles.subtitle}>{t('loginSubtitle')}</Text>
          </View>

          {/* Form */}
          <View style={styles.formCard}>
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
                  placeholder={t('emailPlaceholder')}
                  placeholderTextColor={colors.textLight}
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
                  placeholder={t('passwordPlaceholder')}
                  placeholderTextColor={colors.textLight}
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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  vkuMiniBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: layout.radii.xs,
  },
  vkuMiniText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.primaryDark,
    letterSpacing: 0.5,
  },
  langPillWrapper: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: layout.radii.full,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  langPillBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: layout.radii.full,
  },
  langPillActive: {
    backgroundColor: colors.primary,
  },
  langPillText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
  },
  langPillTextActive: {
    color: colors.textInverse,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.borderHighlight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    ...shadows.subtle,
  },
  iconEmoji: {
    fontSize: 32,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.extrabold,
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 280,
  },
  formCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: layout.radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
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
});
