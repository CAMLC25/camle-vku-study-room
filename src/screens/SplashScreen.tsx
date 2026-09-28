import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { SafeScreen } from '../components/layout/SafeScreen';
import { useAuthStore } from '../store/useAuthStore';
import { useBookingStore } from '../store/useBookingStore';
import { useTranslation } from '../store/useLanguageStore';
import { colors, spacing, typography } from '../theme/theme';

type Props = Partial<NativeStackScreenProps<RootStackParamList, 'Splash'>>;

export const SplashScreen: React.FC<Props> = () => {
  const { t, language } = useTranslation();
  const initializeAuth = useAuthStore((state) => state.initialize);
  const fetchRooms = useBookingStore((state) => state.fetchRooms);

  useEffect(() => {
    let isMounted = true;

    const bootstrapApp = async () => {
      try {
        // Pre-fetch rooms and initialize auth state in parallel
        await Promise.allSettled([
          initializeAuth(),
          fetchRooms(),
        ]);
      } catch (e) {
        console.warn('Bootstrap error:', e);
      }
    };

    bootstrapApp();

    return () => {
      isMounted = false;
    };
  }, [initializeAuth, fetchRooms]);

  return (
    <SafeScreen
      edges={['top', 'bottom', 'left', 'right']}
      backgroundColor={colors.primaryDeep}
      statusBarStyle="light"
    >
      <View style={styles.container}>
        {/* VKU Emblem & Crest */}
        <View style={styles.brandingCenter}>
          <View style={styles.crestCircle}>
            <Text style={styles.crestEmoji}>🏫</Text>
          </View>

          <Text style={styles.title} accessibilityRole="header">
            VKU Study Spaces
          </Text>
          <Text style={styles.universityName}>
            {language === 'vi'
              ? 'TRƯỜNG ĐẠI HỌC CNTT & TRUYỀN THÔNG VIỆT - HÀN'
              : 'VIETNAM - KOREA UNIVERSITY OF ICT'}
          </Text>
          <Text style={styles.tagline}>{t('splashTagline')}</Text>
        </View>

        {/* Loading Indicator & Restoring Notice */}
        <View style={styles.footer}>
          <ActivityIndicator size="small" color="#38bdf8" />
          <Text style={styles.restoringText}>{t('splashRestoring')}</Text>
          <Text style={styles.versionText}>Phiên bản 2.0.0 • Mobile-First</Text>
        </View>
      </View>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryDeep,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  brandingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  crestCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 2,
    borderColor: '#38bdf8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#38bdf8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  crestEmoji: {
    fontSize: 42,
  },
  title: {
    fontSize: 26,
    fontWeight: typography.weights.extrabold,
    color: '#ffffff',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  universityName: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: '#93c5fd',
    letterSpacing: 0.8,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: 13,
    color: '#cbd5e1',
    fontWeight: typography.weights.medium,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  restoringText: {
    fontSize: typography.sizes.xs,
    color: '#94a3b8',
    marginTop: spacing.xs,
  },
  versionText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: spacing.xs,
  },
});
