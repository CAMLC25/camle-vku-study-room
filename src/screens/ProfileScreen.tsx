import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
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
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

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

  const handleSelectStudent = async (student: (typeof REGISTERED_STUDENTS)[0]) => {
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
      {/* University Top Header with Centered Content */}
      <View style={styles.topHeader}>
        <View style={styles.topHeaderInner}>
          <View style={styles.headerLeft}>
            <Text style={styles.vkuTitle}>
              {language === 'vi'
                ? 'ĐẠI HỌC CNTT & TRUYỀN THÔNG VIỆT - HÀN'
                : 'VIETNAM - KOREA UNIVERSITY'}
            </Text>
            <Text style={styles.vkuSubtitle}>VKU Smart Study Spaces</Text>
          </View>

          {/* Compact language toggle */}
          <View style={styles.langPillWrapper}>
            <TouchableOpacity
              style={[styles.langPillBtn, language === 'vi' && styles.langPillActive]}
              onPress={() => setLanguage('vi')}
              activeOpacity={0.7}
            >
              <Text style={[styles.langPillText, language === 'vi' && styles.langPillTextActive]}>
                VN
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langPillBtn, language === 'en' && styles.langPillActive]}
              onPress={() => setLanguage('en')}
              activeOpacity={0.7}
            >
              <Text style={[styles.langPillText, language === 'en' && styles.langPillTextActive]}>
                EN
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Main Centered Content Container */}
      <View style={styles.mainContainer}>
        {/* Student Profile Hero Card */}
        <View style={styles.profileCard}>
          <View style={isDesktop ? styles.profileHeaderDesktop : styles.profileHeaderMobile}>
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

            <View style={styles.profileInfoBlock}>
              <View style={styles.nameRow}>
                <Text style={styles.studentName}>{studentName}</Text>
                <View
                  style={[
                    styles.onlineBadge,
                    { backgroundColor: isConnected ? '#ecfdf5' : '#fffbeb' },
                  ]}
                >
                  <View
                    style={[
                      styles.onlineBadgeDot,
                      { backgroundColor: isConnected ? '#10b981' : '#f59e0b' },
                    ]}
                  />
                  <Text
                    style={[
                      styles.onlineBadgeText,
                      { color: isConnected ? '#059669' : '#d97706' },
                    ]}
                  >
                    {isConnected ? t('statusOnline') : t('statusOffline')}
                  </Text>
                </View>
              </View>

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
                  <Text style={styles.metaBadgeText}>Lớp 21IT1</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Quick Metrics Grid */}
          <View style={styles.systemStatusBar}>
            <View style={styles.systemStatusItem}>
              <Text style={styles.systemStatusLabel}>{t('systemStatusNetwork')}</Text>
              <Text
                style={[
                  styles.systemStatusValue,
                  { color: isConnected ? '#10b981' : '#f59e0b' },
                ]}
              >
                {isConnected ? 'ONLINE' : 'OFFLINE'}
              </Text>
            </View>

            <View style={styles.systemStatusDivider} />

            <View style={styles.systemStatusItem}>
              <Text style={styles.systemStatusLabel}>{t('systemStatusDataMode')}</Text>
              <Text style={styles.systemStatusValue}>REALTIME</Text>
            </View>

            <View style={styles.systemStatusDivider} />

            <View style={styles.systemStatusItem}>
              <Text style={styles.systemStatusLabel}>{t('systemStatusActiveSlots')}</Text>
              <Text style={[styles.systemStatusValue, { color: '#0284c7' }]}>
                {confirmedCount} ca
              </Text>
            </View>

            <View style={styles.systemStatusDivider} />

            <View style={styles.systemStatusItem}>
              <Text style={styles.systemStatusLabel}>{t('systemStatusOutbox')}</Text>
              <Text
                style={[
                  styles.systemStatusValue,
                  { color: pendingSyncCount > 0 ? '#f59e0b' : '#64748b' },
                ]}
              >
                {pendingSyncCount} {t('pendingCountSuffix')}
              </Text>
            </View>
          </View>
        </View>

        {/* Quota & Usage Section (Chỉ tiêu & Hạn mức mượn phòng) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>📊 {t('quotasTitle')}</Text>
              <Text style={styles.sectionSubtitle}>
                {language === 'vi'
                  ? 'Theo dõi số ca đặt tối đa trong ngày, tuần và tương lai'
                  : 'Track your booking limits for today, this week and future'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={refreshQuota}
              style={styles.refreshButton}
              activeOpacity={0.7}
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

          {/* 3 Quota Cards: Responsive Row on Web, Stacked on Mobile */}
          <View style={isDesktop ? styles.quotaRowDesktop : styles.quotaColumnMobile}>
            {/* Daily Quota Card */}
            <View style={[styles.quotaCard, isDesktop && styles.quotaCardDesktop]}>
              <View style={styles.quotaHeader}>
                <View style={styles.quotaHeaderTitleCol}>
                  <Text style={styles.quotaTitle}>{t('dailyQuotaTitle')}</Text>
                  <Text style={styles.quotaDesc}>{t('dailyQuotaDesc')}</Text>
                </View>
                <View style={styles.quotaBadge}>
                  <Text
                    style={[
                      styles.quotaCount,
                      quotaUsage.dailyUsage >= VKU_QUOTA_LIMITS.maxDailySlots &&
                        styles.quotaCountFull,
                    ]}
                  >
                    {quotaUsage.dailyUsage}/{VKU_QUOTA_LIMITS.maxDailySlots}
                  </Text>
                </View>
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
            <View style={[styles.quotaCard, isDesktop && styles.quotaCardDesktop]}>
              <View style={styles.quotaHeader}>
                <View style={styles.quotaHeaderTitleCol}>
                  <Text style={styles.quotaTitle}>{t('weeklyQuotaTitle')}</Text>
                  <Text style={styles.quotaDesc}>{t('weeklyQuotaDesc')}</Text>
                </View>
                <View style={styles.quotaBadge}>
                  <Text
                    style={[
                      styles.quotaCount,
                      quotaUsage.weeklyUsage >= VKU_QUOTA_LIMITS.maxWeeklySlots &&
                        styles.quotaCountFull,
                    ]}
                  >
                    {quotaUsage.weeklyUsage}/{VKU_QUOTA_LIMITS.maxWeeklySlots}
                  </Text>
                </View>
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
            <View style={[styles.quotaCard, isDesktop && styles.quotaCardDesktop]}>
              <View style={styles.quotaHeader}>
                <View style={styles.quotaHeaderTitleCol}>
                  <Text style={styles.quotaTitle}>{t('futureQuotaTitle')}</Text>
                  <Text style={styles.quotaDesc}>{t('futureQuotaDesc')}</Text>
                </View>
                <View style={styles.quotaBadge}>
                  <Text
                    style={[
                      styles.quotaCount,
                      quotaUsage.activeFutureCount >=
                        VKU_QUOTA_LIMITS.maxActiveFutureBookings && styles.quotaCountFull,
                    ]}
                  >
                    {quotaUsage.activeFutureCount}/{VKU_QUOTA_LIMITS.maxActiveFutureBookings}
                  </Text>
                </View>
              </View>

              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(
                        100,
                        (quotaUsage.activeFutureCount /
                          VKU_QUOTA_LIMITS.maxActiveFutureBookings) *
                          100
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
                    (quotaUsage.activeFutureCount /
                      VKU_QUOTA_LIMITS.maxActiveFutureBookings) *
                      100
                  )}%
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Switch Student Account Section (Tài khoản thử nghiệm) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>👥 {t('switchStudentTitle')}</Text>
              <Text style={styles.sectionSubtitle}>{t('switchStudentDesc')}</Text>
            </View>
            {isSwitching && <ActivityIndicator size="small" color="#0284c7" />}
          </View>

          {/* 3 Student Cards in Desktop Row / Mobile Column */}
          <View style={isDesktop ? styles.studentsRowDesktop : styles.studentsListMobile}>
            {REGISTERED_STUDENTS.map((std) => {
              const isCurrent = std.id === studentId;
              return (
                <TouchableOpacity
                  key={std.id}
                  style={[
                    styles.studentItemCard,
                    isDesktop && styles.studentItemCardDesktop,
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
                    <View style={styles.studentItemDetails}>
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

        {/* Account Utilities & Reset Section */}
        <View style={styles.section}>
          <View style={styles.utilitiesCard}>
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
                    ⚡ {t('syncOutboxBtn')} ({pendingSyncCount})
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
            <Text style={styles.resetHintText}>
              {language === 'vi'
                ? 'Xóa toàn bộ bộ nhớ tạm offline và làm mới lại hạn mức từ máy chủ VKU'
                : 'Clear local offline cache and re-sync quota from VKU server'}
            </Text>
          </View>
        </View>
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
    paddingBottom: 110,
  },
  topHeader: {
    backgroundColor: '#0c4a6e',
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: '100%',
  },
  topHeaderInner: {
    maxWidth: 1040,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  vkuTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#e0f2fe',
    letterSpacing: 0.5,
  },
  vkuSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    fontWeight: '500',
  },
  langPillWrapper: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 3,
    gap: 3,
  },
  langPillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
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
  mainContainer: {
    maxWidth: 1040,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 16,
    marginTop: 18,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
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
      web: {
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
      } as any,
    }),
  },
  profileHeaderDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  profileHeaderMobile: {
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: 12,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#0284c7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '800',
  },
  statusDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: '#ffffff',
    position: 'absolute',
    bottom: 2,
    right: 2,
  },
  profileInfoBlock: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  studentName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  onlineBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  onlineBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  studentCode: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  metaBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 9,
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
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  systemStatusItem: {
    alignItems: 'center',
    flex: 1,
  },
  systemStatusLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  systemStatusValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 3,
  },
  systemStatusDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e2e8f0',
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#e0f2fe',
  },
  refreshButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284c7',
  },
  quotaRowDesktop: {
    flexDirection: 'row',
    gap: 16,
  },
  quotaColumnMobile: {
    flexDirection: 'column',
    gap: 12,
  },
  quotaCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      } as any,
    }),
  },
  quotaCardDesktop: {
    flex: 1,
  },
  quotaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  quotaHeaderTitleCol: {
    flex: 1,
    paddingRight: 8,
  },
  quotaTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  quotaDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 3,
    lineHeight: 16,
  },
  quotaBadge: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quotaCount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  quotaCountFull: {
    color: '#ef4444',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  quotaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  quotaStatusText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  quotaPercent: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  studentsRowDesktop: {
    flexDirection: 'row',
    gap: 14,
  },
  studentsListMobile: {
    flexDirection: 'column',
    gap: 10,
  },
  studentItemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      } as any,
    }),
  },
  studentItemCardDesktop: {
    flex: 1,
    minHeight: 110,
  },
  studentItemCardActive: {
    borderColor: '#0284c7',
    backgroundColor: '#f0f9ff',
  },
  studentItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  studentMiniAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentMiniAvatarActive: {
    backgroundColor: '#0284c7',
  },
  studentMiniAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
  },
  studentMiniAvatarTextActive: {
    color: '#ffffff',
  },
  studentItemDetails: {
    flex: 1,
  },
  studentItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  studentItemCode: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  activeStudentBadge: {
    marginTop: 12,
    alignSelf: 'flex-start',
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
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  switchButtonPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
  },
  utilitiesCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  syncButton: {
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    marginBottom: 10,
  },
  syncButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  resetButton: {
    backgroundColor: '#fff1f2',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  resetButtonText: {
    color: '#e11d48',
    fontSize: 13,
    fontWeight: '700',
  },
  resetHintText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center',
  },
});
