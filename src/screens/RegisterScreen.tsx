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

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { t, language } = useTranslation();
  const register = useAuthStore((state) => state.register);
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

  const handleRegister = async () => {
    setLocalError(null);
    clearError();

    if (!fullName.trim() || !studentCode.trim() || !email.trim() || !password) {
      setLocalError(t('fillAllFields'));
      return;
    }

    if (!email.trim().includes('@')) {
      setLocalError(
        language === 'vi'
          ? 'Vui lòng nhập đúng định dạng Email (VD: sinhvien@gmail.com)'
          : 'Please enter a valid email address'
      );
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
      backgroundColor="#f8fafc"
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
          {/* Main Clean Card */}
          <View style={styles.formCard}>
            {/* Top Bar inside Card */}
            <View style={styles.cardTopRow}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t('back')}
              >
                <Text style={styles.backButtonText}>‹ {t('back')}</Text>
              </TouchableOpacity>

              <View style={styles.vkuMiniBadge}>
                <Text style={styles.vkuMiniText}>VKU REGISTRATION</Text>
              </View>
            </View>

            {/* Header inside Card */}
            <View style={styles.cardHeader}>
              <Text style={styles.title} accessibilityRole="header">
                {t('registerTitle')}
              </Text>
              <Text style={styles.subtitle}>{t('registerSubtitle')}</Text>
            </View>

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
                  placeholderTextColor="#94a3b8"
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
                    placeholderTextColor="#94a3b8"
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
                    placeholderTextColor="#94a3b8"
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
                  placeholderTextColor="#94a3b8"
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
                  placeholderTextColor="#94a3b8"
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
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xl,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
    justifyContent: 'center',
  },
  formCard: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 28,
    paddingVertical: 32,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
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
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  backButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  vkuMiniBadge: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  vkuMiniText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803d',
    letterSpacing: 0.6,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
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
    maxWidth: 340,
    lineHeight: 18,
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
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
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
    color: '#15803d',
  },
  inlineRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inlineCol: {
    flex: 1,
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
    backgroundColor: '#f8fafc',
    borderRadius: layout.radii.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
  registerButton: {
    backgroundColor: '#0284c7',
    minHeight: layout.buttonHeight,
    borderRadius: layout.radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xs,
    ...Platform.select({
      ios: {
        shadowColor: '#0284c7',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
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
    color: '#ffffff',
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
  },
  switchAuthRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  switchAuthText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  switchAuthLink: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: '#0284c7',
  },
});
