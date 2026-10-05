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

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { t, language } = useTranslation();
  const register = useAuthStore((state) => state.register);
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const isLoading = useAuthStore((state) => state.isLoading);
  const authError = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const [fullName, setFullName] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [className, setClassName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleGoogleSelect = async () => {
    setLocalError(
      language === 'vi'
        ? 'Tính năng Google OAuth chưa được kích hoạt trên Supabase Dashboard. Vui lòng điền thông tin và bấm Đăng ký tài khoản ở bên dưới.'
        : 'Google OAuth is not enabled on Supabase Dashboard. Please fill in your details and register using email below.'
    );
  };

  const handleRegister = async () => {
    setLocalError(null);
    clearError();

    if (!fullName.trim() || !studentCode.trim() || !email.trim() || !password) {
      setLocalError(t('fillAllFields'));
      return;
    }

    if (password.length < 6) {
      setLocalError(t('passwordTooShort'));
      return;
    }

    if (password !== confirmPassword) {
      setLocalError(t('passwordMismatch'));
      return;
    }

    const res = await register({
      email: email.trim(),
      password,
      studentCode: studentCode.trim().toUpperCase(),
      fullName: fullName.trim(),
      className: className.trim() || 'VKU',
    });

    if (!res.success && !res.error) {
      setLocalError(t('errUnknown'));
    }
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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar with Back Button */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={t('back')}
            >
              <Text style={styles.backButtonText}>‹</Text>
            </TouchableOpacity>

            <View style={styles.vkuMiniBadge}>
              <Text style={styles.vkuMiniText}>VKU REGISTRATION</Text>
            </View>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              {t('registerTitle')}
            </Text>
            <Text style={styles.subtitle}>{t('registerSubtitle')}</Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            {/* Notification / Error Banner */}
            {displayError && (
              <View
                style={[
                  styles.errorBanner,
                  (displayError.includes('thành công') || displayError.includes('success')) &&
                    styles.successBanner,
                ]}
              >
                <Text style={styles.errorIcon}>
                  {displayError.includes('thành công') || displayError.includes('success')
                    ? '✅'
                    : '⚠️'}
                </Text>
                <Text
                  style={[
                    styles.errorText,
                    (displayError.includes('thành công') || displayError.includes('success')) &&
                      styles.successText,
                  ]}
                >
                  {displayError}
                </Text>
              </View>
            )}

            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('fullNameLabel')} *</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputPrefixIcon}>👤</Text>
                <TextInput
                  style={styles.textInput}
                  value={fullName}
                  onChangeText={(text) => {
                    setFullName(text);
                    if (displayError) clearError();
                  }}
                  placeholder={t('fullNamePlaceholder')}
                  placeholderTextColor={colors.textLight}
                  autoCapitalize="words"
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Student Code & Class Name Row */}
            <View style={styles.inlineRow}>
              <View style={[styles.inputGroup, styles.inlineCol]}>
                <Text style={styles.inputLabel}>{t('studentCodeLabel')} *</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputPrefixIcon}>🏷️</Text>
                  <TextInput
                    style={styles.textInput}
                    value={studentCode}
                    onChangeText={(text) => {
                      setStudentCode(text);
                      if (displayError) clearError();
                    }}
                    placeholder={t('studentCodePlaceholder')}
                    placeholderTextColor={colors.textLight}
                    autoCapitalize="characters"
                    editable={!isLoading}
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, styles.inlineCol]}>
                <Text style={styles.inputLabel}>{t('classNameLabel')}</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputPrefixIcon}>🏫</Text>
                  <TextInput
                    style={styles.textInput}
                    value={className}
                    onChangeText={setClassName}
                    placeholder={t('classNamePlaceholder')}
                    placeholderTextColor={colors.textLight}
                    autoCapitalize="characters"
                    editable={!isLoading}
                  />
                </View>
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('emailLabel')} *</Text>
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

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('passwordLabel')} *</Text>
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
                >
                  <Text style={styles.eyeText}>{showPassword ? '👁️' : '🙈'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('confirmPasswordLabel')} *</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputPrefixIcon}>🛡️</Text>
                <TextInput
                  style={styles.textInput}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (displayError) clearError();
                  }}
                  placeholder={t('confirmPasswordPlaceholder')}
                  placeholderTextColor={colors.textLight}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={[styles.registerButton, isLoading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('registerBtn')}
            >
              {isLoading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.registerButtonText}>{t('registerInProgress')}</Text>
                </View>
              ) : (
                <Text style={styles.registerButtonText}>{t('registerBtn')}</Text>
              )}
            </TouchableOpacity>

            {/* Divider OR */}
            <View style={styles.orDividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.orText}>{t('orDivider')}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Sign-In / Sign-Up Button */}
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

            {/* Return to Login link */}
            <View style={styles.switchAuthRow}>
              <Text style={styles.switchAuthText}>{t('hasAccountPrompt')} </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                disabled={isLoading}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
              >
                <Text style={styles.switchAuthLink}>{t('loginNow')}</Text>
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
    backgroundColor: '#f1f5f9',
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
    marginBottom: spacing.sm,
  },
  backButton: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: layout.minTouchTarget / 2,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 26,
    color: colors.textPrimary,
    lineHeight: 28,
    marginTop: -2,
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
  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.extrabold,
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    textAlign: 'center',
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
  successBanner: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
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
  successText: {
    color: '#065f46',
  },
  inlineRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inlineCol: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: spacing.sm + 2,
  },
  inputLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    marginBottom: spacing.xxs + 2,
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
    fontSize: 14,
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
  registerButton: {
    backgroundColor: colors.primary,
    minHeight: layout.buttonHeight,
    borderRadius: layout.radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
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
  registerButtonText: {
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
