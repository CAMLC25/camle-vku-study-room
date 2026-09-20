import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useBookingStore } from '../store/useBookingStore';
import { useNetworkStore } from '../store/useNetworkStore';
import { useTranslation } from '../store/useLanguageStore';
import { bookingService } from '../services/bookingService';
import { syncService } from '../services/syncService';
import { showConfirmDialog, showAlertDialog } from '../utils/dialog';
import { VKU_QUOTA_LIMITS } from '../types/quota';

// 3 Registered Test Students in Supabase Database
const REGISTERED_STUDENTS = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    code: '21IT001',
    name: 'Nguyễn Văn A',
    class: '21IT1',
    avatarChar: 'A',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    code: '21IT002',
    name: 'Trần Thị B',
    class: '21IT2',
    avatarChar: 'B',
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    code: '21IT003',
    name: 'Lê Văn C',
    class: '21IT3',
    avatarChar: 'C',
  },
];

export const ProfileScreen: React.FC = () => {
  const { t, language, setLanguage } = useTranslation();
  const studentId = useBookingStore((state) => state.currentStudentId);
  const studentName = useBookingStore((state) => state.currentStudentName);
  const studentCode = useBookingStore((state) => state.currentStudentCode);
  const quotaUsage = useBookingStore((state) => state.quotaUsage);
  const setQuotaUsage = useBookingStore((state) => state.setQuotaUsage);
  const switchStudent = useBookingStore((state) => state.switchStudent);
  const clearAllStorageAndReset = useBookingStore((state) => state.clearAllStorageAndReset);
  const myBookings = useBookingStore((state) => state.myBookings);
  const outbox = useBookingStore((state) => state.outbox);

  const isConnected = useNetworkStore((state) => state.network.isConnected);
  const isSyncing = useNetworkStore((state) => state.sync.isSyncing);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

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

  const handleSelectStudent = async (student: typeof REGISTERED_STUDENTS[0]) => {
    if (student.id === studentId) return;
    setIsSwitching(true);
    try {
      await switchStudent(student);
      showAlertDialog(
        language === 'vi' ? 'Đã đổi tài khoản' : 'Account Switched',
        language === 'vi'
          ? `Đã đăng nhập tài khoản: ${student.name} (${student.code})`
          : `Switched account to: ${student.name} (${student.code})`,
        undefined,
        'success'
      );
    } catch (e) {
      console.error('Failed to switch student', e);
    } finally {
      setIsSwitching(false);
    }
  };

  const handleResetData = () => {
    showConfirmDialog({
      title: t('clearCacheConfirmTitle'),
      message: t('clearCacheConfirmMsg'),
      cancelText: t('cancel'),
      confirmText: t('confirm'),
      onConfirm: async () => {
        await clearAllStorageAndReset();
        await refreshQuota();
        showAlertDialog(t('resetCompleteTitle'), t('resetCompleteMsg'));
      },
    });
  };

  const handleManualSync = async () => {
    if (!isConnected) {
      showAlertDialog(t('offlineAlertTitle'), t('offlineAlertMsg'));
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
      {/* University Top Header with Language Pill */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.vkuTitle}>
            {language === 'vi' ? 'ĐẠI HỌC CNTT & TRUYỀN THÔNG VIỆT - HÀN' : 'VIETNAM - KOREA UNIVERSITY'}
          </Text>
          <Text style={styles.vkuSubtitle}>VKU Smart Study Spaces</Text>
        </View>

        {/* Compact, elegant language toggle at top-right */}
        <View style={styles.langPillWrapper}>
          <TouchableOpacity
            style={[styles.langPillBtn, language === 'vi' && styles.langPillActive]}
            onPress={() => setLanguage('vi')}
            activeOpacity={0.7}
          >
            <Text style={[styles.langPillText, language === 'vi' && styles.langPillTextActive]}>
              🇻🇳 VN
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langPillBtn, language === 'en' && styles.langPillActive]}
            onPress={() => setLanguage('en')}
            activeOpacity={0.7}
          >
            <Text style={[styles.langPillText, language === 'en' && styles.langPillTextActive]}>
              🇬🇧 EN
            </Text>
          </TouchableOpacity>
        </View>
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
            <Text style={styles.metaBadgeText}>
              {language === 'vi' ? 'Khoa CNTT & TT' : 'Faculty of ICT'}
            </Text>
          </View>
          <View style={styles.metaBadge}>
            <Text style={styles.metaBadgeText}>
              {language === 'vi' ? 'Khóa 2021 – 2026' : 'Cohort 2021 – 2026'}
            </Text>
          </View>
          <View style={styles.metaBadge}>
            <Text style={styles.metaBadgeText}>21IT1</Text>
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
            <Text style={styles.systemStatusValue}>ONLINE</Text>
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

      {/* Switch Student Account Section (For Testing & Quota switching) */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>👥 {t('switchStudentTitle')}</Text>
            <Text style={styles.sectionSubtitle}>{t('switchStudentDesc')}</Text>
          </View>
          {isSwitching && <ActivityIndicator size="small" color="#0284c7" />}
        </View>

        <View style={styles.studentsList}>
          {REGISTERED_STUDENTS.map((std) => {
            const isCurrent = std.id === studentId;
            return (
              <TouchableOpacity
                key={std.id}
                style={[
                  styles.studentItemCard,
                  isCurrent && styles.studentItemCardActive,
                ]}
                onPress={() => handleSelectStudent(std)}
                activeOpacity={0.7}
              >
                <View style={styles.studentItemLeft}>
                  <View
                    style={[
                      styles.studentMiniAvatar,
                      isCurrent && styles.studentMiniAvatarActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.studentMiniAvatarText,
                        isCurrent && styles.studentMiniAvatarTextActive,
                      ]}
                    >
                      {std.avatarChar}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.studentItemName}>{std.name}</Text>
                    <Text style={styles.studentItemCode}>
                      MSSV: {std.code} • {std.class}
                    </Text>
                  </View>
                </View>

                {isCurrent ? (
                  <View style={styles.activeStudentBadge}>
                    <Text style={styles.activeStudentBadgeText}>
                      ✓ {t('activeStudentBadge')}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.switchButtonPill}>
                    <Text style={styles.switchButtonPillText}>
                      {language === 'vi' ? 'Chọn' : 'Select'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Quota & Usage Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📊 {t('quotasTitle')}</Text>
          <TouchableOpacity
            onPress={refreshQuota}
            style={styles.refreshButton}
            accessibilityRole="button"
            accessibilityLabel="Refresh quota usage"
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color="#0284c7" />
            ) : (
              <Text style={styles.refreshButtonText}>🔄 {t('refresh')}</Text>
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
            <Text
              style={[
                styles.quotaCount,
                quotaUsage.dailyUsage >= VKU_QUOTA_LIMITS.maxDailySlots && styles.quotaCountFull,
              ]}
            >
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
            <Text
              style={[
                styles.quotaCount,
                quotaUsage.weeklyUsage >= VKU_QUOTA_LIMITS.maxWeeklySlots && styles.quotaCountFull,
              ]}
            >
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
            <Text
              style={[
                styles.quotaCount,
                quotaUsage.activeFutureCount >= VKU_QUOTA_LIMITS.maxActiveFutureBookings &&
                  styles.quotaCountFull,
              ]}
            >
              {quotaUsage.activeFutureCount} / {VKU_QUOTA_LIMITS.maxActiveFutureBookings}
            </Text>
          </View>

          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(
                    100,
                    (quotaUsage.activeFutureCount / VKU_QUOTA_LIMITS.maxActiveFutureBookings) * 100
                  )}%`,
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
                (quotaUsage.activeFutureCount / VKU_QUOTA_LIMITS.maxActiveFutureBookings) * 100
              )}%
            </Text>
          </View>
        </View>
      </View>

      {/* Account Settings & Outbox Section */}
      <View style={styles.section}>
        {pendingSyncCount > 0 && (
          <TouchableOpacity
            style={styles.syncButton}
            onPress={handleManualSync}
            disabled={isSyncing}
            activeOpacity={0.8}
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
          activeOpacity={0.7}
        >
          <Text style={styles.resetButtonText}>🗑️ {t('clearCacheBtn')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  topHeader: {
    backgroundColor: '#0c4a6e',
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  vkuTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#e0f2fe',
    letterSpacing: 0.5,
  },
  vkuSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
    fontWeight: '500',
  },
  langPillWrapper: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 2,
    gap: 2,
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
  profileCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#0284c7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#ffffff',
    position: 'absolute',
    bottom: 2,
    right: 2,
  },
  studentName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  studentCode: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  metaBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  metaBadgeText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  systemStatusBar: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  systemStatusItem: {
    alignItems: 'center',
  },
  systemStatusLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  systemStatusValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  systemStatusDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#e2e8f0',
  },
  section: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  refreshButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#e0f2fe',
  },
  refreshButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284c7',
  },
  studentsList: {
    gap: 8,
  },
  studentItemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  studentItemCardActive: {
    borderColor: '#0284c7',
    backgroundColor: '#f0f9ff',
  },
  studentItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  studentMiniAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentMiniAvatarActive: {
    backgroundColor: '#0284c7',
  },
  studentMiniAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  studentMiniAvatarTextActive: {
    color: '#ffffff',
  },
  studentItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  studentItemCode: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  activeStudentBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  activeStudentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },
  switchButtonPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  switchButtonPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  quotaCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quotaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  quotaTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  quotaDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  quotaCount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  quotaCountFull: {
    color: '#ef4444',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  quotaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  quotaStatusText: {
    fontSize: 11,
    color: '#64748b',
  },
  quotaPercent: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  syncButton: {
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  syncButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  resetButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  resetButtonText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '600',
  },
});
