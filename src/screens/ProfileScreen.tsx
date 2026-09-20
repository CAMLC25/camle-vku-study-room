import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useBookingStore } from '../store/useBookingStore';
import { useNetworkStore } from '../store/useNetworkStore';
import { useTranslation } from '../store/useLanguageStore';
import { bookingService } from '../services/bookingService';
import { syncService } from '../services/syncService';
import { VKU_QUOTA_LIMITS } from '../types/quota';
import { ENV } from '../config/environment';

export const ProfileScreen: React.FC = () => {
  const { t, language, setLanguage } = useTranslation();
  const studentId = useBookingStore((state) => state.currentStudentId);
  const studentName = useBookingStore((state) => state.currentStudentName);
  const studentCode = useBookingStore((state) => state.currentStudentCode);
  const quotaUsage = useBookingStore((state) => state.quotaUsage);
  const setQuotaUsage = useBookingStore((state) => state.setQuotaUsage);
  const clearAllStorageAndReset = useBookingStore((state) => state.clearAllStorageAndReset);
  const myBookings = useBookingStore((state) => state.myBookings);
  const outbox = useBookingStore((state) => state.outbox);

  const isConnected = useNetworkStore((state) => state.network.isConnected);
  const isSyncing = useNetworkStore((state) => state.sync.isSyncing);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshQuota = async () => {
    setIsRefreshing(true);
    try {
      const usage = await bookingService.getStudentQuotaUsage(studentId);
      setQuotaUsage(usage);
    } catch (e) {
      console.warn('Failed to refresh quota:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshQuota();
  }, [studentId]);

  const handleResetData = () => {
    Alert.alert(
      t('resetDemoConfirmTitle'),
      t('resetDemoConfirmMsg'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('confirm'),
          style: 'destructive',
          onPress: async () => {
            await clearAllStorageAndReset();
            await refreshQuota();
            Alert.alert(t('resetCompleteTitle'), t('resetCompleteMsg'));
          },
        },
      ]
    );
  };

  const handleManualSync = async () => {
    if (!isConnected) {
      Alert.alert(t('offlineAlertTitle'), t('offlineAlertMsg'));
      return;
    }
    await syncService.flushOutboxSequentially();
    await refreshQuota();
  };

  const getProgressColor = (used: number, max: number) => {
    const ratio = used / max;
    if (ratio >= 1) return '#ef4444'; // Full (Red)
    if (ratio >= 0.7) return '#f59e0b'; // Near limit (Amber)
    return '#10b981'; // Safe (Green)
  };

  const pendingSyncCount = outbox.filter((i) => i.status === 'PENDING_SYNC').length;
  const confirmedCount = myBookings.filter((b) => b.status === 'CONFIRMED').length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* University Banner */}
      <View style={styles.vkuBanner}>
        <Text style={styles.vkuTitle}>
          {language === 'vi' ? 'TRƯỜNG ĐẠI HỌC CNTT & TRUYỀN THÔNG VIỆT - HÀN' : 'VIETNAM - KOREA UNIVERSITY'}
        </Text>
        <Text style={styles.vkuSubtitle}>
          {language === 'vi' ? 'Vietnam - Korea University of Information and Communication Technology' : 'Information and Communication Technology'}
        </Text>
      </View>

      {/* Student Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarWrapper}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{studentName.charAt(0)}</Text>
          </View>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isConnected ? '#10b981' : '#f59e0b' },
            ]}
          />
        </View>

        <Text style={styles.studentName}>{studentName}</Text>
        <Text style={styles.studentCode}>MSSV: {studentCode}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaBadge}>
            <Text style={styles.metaBadgeText}>{language === 'vi' ? 'Khoa CNTT & TT' : 'Faculty of ICT'}</Text>
          </View>
          <View style={styles.metaBadge}>
            <Text style={styles.metaBadgeText}>{language === 'vi' ? 'Khóa 2021 – 2026' : 'Cohort 2021 – 2026'}</Text>
          </View>
          <View style={styles.metaBadge}>
            <Text style={styles.metaBadgeText}>Lớp 21IT1</Text>
          </View>
        </View>

        {/* System Diagnostics Bar */}
        <View style={styles.systemStatusBar}>
          <View style={styles.systemStatusItem}>
            <Text style={styles.systemStatusLabel}>{t('systemStatusNetwork')}</Text>
            <Text
              style={[
                styles.systemStatusValue,
                { color: isConnected ? '#10b981' : '#f59e0b' },
              ]}
            >
              {isConnected ? t('statusOnline') : t('statusOffline')}
            </Text>
          </View>

          <View style={styles.systemStatusDivider} />

          <View style={styles.systemStatusItem}>
            <Text style={styles.systemStatusLabel}>{t('systemStatusDataMode')}</Text>
            <Text style={styles.systemStatusValue}>
              {ENV.appDataMode === 'supabase' ? 'SUPABASE' : 'MOCK'}
            </Text>
          </View>

          <View style={styles.systemStatusDivider} />

          <View style={styles.systemStatusItem}>
            <Text style={styles.systemStatusLabel}>{t('systemStatusActiveSlots')}</Text>
            <Text style={styles.systemStatusValue}>{confirmedCount}</Text>
          </View>

          <View style={styles.systemStatusDivider} />

          <View style={styles.systemStatusItem}>
            <Text style={styles.systemStatusLabel}>{t('systemStatusOutbox')}</Text>
            <Text
              style={[
                styles.systemStatusValue,
                { color: pendingSyncCount > 0 ? '#f59e0b' : '#0284c7' },
              ]}
            >
              {pendingSyncCount} {t('pendingCountSuffix')}
            </Text>
          </View>
        </View>
      </View>

      {/* Language Selector Card */}
      <View style={styles.languageCard}>
        <View style={styles.languageHeader}>
          <Text style={styles.languageTitle}>🌐 {t('languageLabel')}</Text>
          <Text style={styles.languageActiveText}>
            {language === 'vi' ? 'Tiếng Việt 🇻🇳' : 'English 🇬🇧'}
          </Text>
        </View>
        <View style={styles.languageButtonRow}>
          <TouchableOpacity
            style={[
              styles.langBtn,
              language === 'vi' && styles.langBtnActive,
            ]}
            onPress={() => setLanguage('vi')}
            accessibilityRole="button"
            accessibilityLabel="Chọn Tiếng Việt"
          >
            <Text style={styles.langFlag}>🇻🇳</Text>
            <Text
              style={[
                styles.langBtnText,
                language === 'vi' && styles.langBtnTextActive,
              ]}
            >
              {t('vietnamese')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.langBtn,
              language === 'en' && styles.langBtnActive,
            ]}
            onPress={() => setLanguage('en')}
            accessibilityRole="button"
            accessibilityLabel="Select English"
          >
            <Text style={styles.langFlag}>🇬🇧</Text>
            <Text
              style={[
                styles.langBtnText,
                language === 'en' && styles.langBtnTextActive,
              ]}
            >
              {t('english')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quota & Usage Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('quotasTitle')}</Text>
          <TouchableOpacity
            onPress={refreshQuota}
            style={styles.refreshButton}
            accessibilityRole="button"
            accessibilityLabel="Refresh quota usage"
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color="#0284c7" />
            ) : (
              <Text style={styles.refreshButtonText}>{t('refresh')}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Daily Quota Card */}
        <View style={styles.quotaCard}>
          <View style={styles.quotaHeader}>
            <View>
              <Text style={styles.quotaTitle}>{t('dailyQuotaTitle')}</Text>
              <Text style={styles.quotaDesc}>{t('dailyQuotaDesc')}</Text>
            </View>
            <Text style={styles.quotaCount}>
              {quotaUsage.dailyUsage} / {VKU_QUOTA_LIMITS.maxDailySlots}
            </Text>
          </View>

          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(100, (quotaUsage.dailyUsage / VKU_QUOTA_LIMITS.maxDailySlots) * 100)}%`,
                  backgroundColor: getProgressColor(
                    quotaUsage.dailyUsage,
                    VKU_QUOTA_LIMITS.maxDailySlots
                  ),
                },
              ]}
            />
          </View>

          <View style={styles.quotaFooter}>
            <Text style={styles.quotaStatusText}>
              {quotaUsage.dailyRemaining > 0
                ? `${quotaUsage.dailyRemaining} ${t('dailyRemainingText')}`
                : t('dailyLimitReached')}
            </Text>
            <Text style={styles.quotaPercent}>
              {Math.round((quotaUsage.dailyUsage / VKU_QUOTA_LIMITS.maxDailySlots) * 100)}%
            </Text>
          </View>
        </View>

        {/* Weekly Quota Card */}
        <View style={styles.quotaCard}>
          <View style={styles.quotaHeader}>
            <View>
              <Text style={styles.quotaTitle}>{t('weeklyQuotaTitle')}</Text>
              <Text style={styles.quotaDesc}>{t('weeklyQuotaDesc')}</Text>
            </View>
            <Text style={styles.quotaCount}>
              {quotaUsage.weeklyUsage} / {VKU_QUOTA_LIMITS.maxWeeklySlots}
            </Text>
          </View>

          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(100, (quotaUsage.weeklyUsage / VKU_QUOTA_LIMITS.maxWeeklySlots) * 100)}%`,
                  backgroundColor: getProgressColor(
                    quotaUsage.weeklyUsage,
                    VKU_QUOTA_LIMITS.maxWeeklySlots
                  ),
                },
              ]}
            />
          </View>

          <View style={styles.quotaFooter}>
            <Text style={styles.quotaStatusText}>
              {quotaUsage.weeklyRemaining > 0
                ? `${quotaUsage.weeklyRemaining} ${t('weeklyRemainingText')}`
                : t('weeklyLimitReached')}
            </Text>
            <Text style={styles.quotaPercent}>
              {Math.round((quotaUsage.weeklyUsage / VKU_QUOTA_LIMITS.maxWeeklySlots) * 100)}%
            </Text>
          </View>
        </View>

        {/* Active Future Bookings Card */}
        <View style={styles.quotaCard}>
          <View style={styles.quotaHeader}>
            <View>
              <Text style={styles.quotaTitle}>{t('futureQuotaTitle')}</Text>
              <Text style={styles.quotaDesc}>{t('futureQuotaDesc')}</Text>
            </View>
            <Text style={styles.quotaCount}>
              {quotaUsage.activeFutureCount} / {VKU_QUOTA_LIMITS.maxActiveFutureBookings}
            </Text>
          </View>

          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(100, (quotaUsage.activeFutureCount / VKU_QUOTA_LIMITS.maxActiveFutureBookings) * 100)}%`,
                  backgroundColor: getProgressColor(
                    quotaUsage.activeFutureCount,
                    VKU_QUOTA_LIMITS.maxActiveFutureBookings
                  ),
                },
              ]}
            />
          </View>

          <View style={styles.quotaFooter}>
            <Text style={styles.quotaStatusText}>
              {quotaUsage.activeFutureRemaining > 0
                ? `${quotaUsage.activeFutureRemaining} ${t('futureRemainingText')}`
                : t('futureLimitReached')}
            </Text>
            <Text style={styles.quotaPercent}>
              {Math.round(
                (quotaUsage.activeFutureCount /
                  VKU_QUOTA_LIMITS.maxActiveFutureBookings) *
                  100
              )}
              %
            </Text>
          </View>
        </View>
      </View>

      {/* Demo Controls & Testing Suite */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('demoControlsTitle')}</Text>

        {pendingSyncCount > 0 && (
          <TouchableOpacity
            style={styles.syncButton}
            onPress={handleManualSync}
            disabled={isSyncing}
            accessibilityRole="button"
            accessibilityLabel="Sync outbox queue now"
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.syncButtonText}>
                {t('syncOutboxBtn')} ({pendingSyncCount})
              </Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleResetData}
          accessibilityRole="button"
          accessibilityLabel="Reset demo state and bookings"
        >
          <Text style={styles.resetButtonText}>{t('resetDemoBtn')}</Text>
        </TouchableOpacity>

        {/* Technical Architecture Footnote */}
        <View style={styles.specsCard}>
          <Text style={styles.specsTitle}>{t('systemDiagnosticsTitle')}</Text>
          <Text style={styles.specsItem}>• {t('engineSpec')}</Text>
          <Text style={styles.specsItem}>• {t('databaseSpec')}</Text>
          <Text style={styles.specsItem}>• {t('concurrencySpec')}</Text>
          <Text style={styles.specsItem}>• {t('offlineSpec')}</Text>
          <Text style={styles.specsItem}>• {t('stateSpec')}</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  vkuBanner: {
    backgroundColor: '#0c4a6e',
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  vkuTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#e0f2fe',
    letterSpacing: 0.8,
  },
  vkuSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#0284c7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#e0f2fe',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  studentName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  studentCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  metaBadge: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metaBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  systemStatusBar: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  systemStatusItem: {
    alignItems: 'center',
  },
  systemStatusLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  systemStatusValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  systemStatusDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#cbd5e1',
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.6,
  },
  refreshButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#e0f2fe',
    minHeight: 28,
    justifyContent: 'center',
  },
  refreshButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284c7',
  },
  quotaCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  quotaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  quotaTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  quotaDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  quotaCount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0284c7',
  },
  progressBarTrack: {
    height: 10,
    backgroundColor: '#e2e8f0',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  quotaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quotaStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  quotaPercent: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  syncButton: {
    backgroundColor: '#0284c7',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    minHeight: 48,
    justifyContent: 'center',
  },
  syncButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  resetButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    minHeight: 48,
    justifyContent: 'center',
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dc2626',
  },
  specsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  specsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  specsItem: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 18,
  },
  languageCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  languageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  languageTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  languageActiveText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0284c7',
  },
  languageButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  langBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  langBtnActive: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0284c7',
  },
  langFlag: {
    fontSize: 18,
  },
  langBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  langBtnTextActive: {
    color: '#0369a1',
    fontWeight: '800',
  },
});
