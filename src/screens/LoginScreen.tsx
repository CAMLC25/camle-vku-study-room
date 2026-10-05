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

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { t, language, setLanguage } = useTranslation();
  const login = useAuthStore((state) => state.login);
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

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setLocalError(t('fillAllFields'));
      return;
    }

    if (!trimmedEmail.includes('@')) {
      setLocalError(
        language === 'vi'
          ? 'Vui lòng nhập đúng địa chỉ Email (VD: sinhvien@gmail.com)'
          : 'Please enter a valid email address'
      );
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
            {/* Top Bar inside Card: Branding + Language Selector */}
            <View style={styles.cardTopRow}>
              <View style={styles.vkuMiniBadge}>
                <Text style={styles.vkuMiniText}>VKU SMART STUDY</Text>
              </View>

              <View style={styles.langPillWrapper}>
                <TouchableOpacity
                  style={[styles.langPillBtn, language === 'vi' && styles.langPillActive]}
                  onPress={() => setLanguage('vi')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Tiếng Việt"
                >
                  <Text
                    style={[
                      styles.langPillText,
                      language === 'vi' && styles.langPillTextActive,
                    ]}
                  >
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
                  <Text
                    style={[
                      styles.langPillText,
                      language === 'en' && styles.langPillTextActive,
                    ]}
                  >
                    EN
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

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
                      ? 'Nhập địa chỉ Email (VD: sinhvien@gmail.com)'
                      : 'Enter your email (e.g. student@gmail.com)'
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
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xl,
    maxWidth: 460,
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
  langPillWrapper: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    padding: 2,
    gap: 2,
  },
  langPillBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 14,
  },
  langPillActive: {
    backgroundColor: '#ffffff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      } as any,
    }),
  },
  langPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  langPillTextActive: {
    color: '#0284c7',
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e0f2fe',
    borderWidth: 2,
    borderColor: '#bae6fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    ...shadows.subtle,
  },
  iconEmoji: {
    fontSize: 30,
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
  loginButton: {
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
  loginButtonText: {
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
