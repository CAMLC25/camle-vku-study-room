import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Pressable,
} from 'react-native';
import { Room } from '../types/room';
import { SlotIndex, TIME_SLOT_DEFINITIONS } from '../types/slot';
import { Booking, BookingHold } from '../types/booking';
import { StudentQuotaUsage, VKU_QUOTA_LIMITS } from '../types/quota';
import { bookingService } from '../services/bookingService';
import { generateIdempotencyKey } from '../utils/idempotency';
import { formatDisplayDate } from '../utils/date';
import { mapErrorToDomain, DomainError } from '../utils/errors';
import { outboxService } from '../services/outboxService';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useTranslation } from '../store/useLanguageStore';
import { TranslationKey } from '../i18n/translations';

const MAX_HOLD_SECONDS = 90;

interface ConfirmBookingModalProps {
  visible: boolean;
  room: Room;
  bookingDate: string; // ISO 'YYYY-MM-DD'
  slotIndex: SlotIndex;
  studentId: string;
  studentName: string;
  onClose: () => void;
  onSuccess: (booking: Booking, isReplay: boolean) => void;
}

export const ConfirmBookingModal: React.FC<ConfirmBookingModalProps> = ({
  visible,
  room,
  bookingDate,
  slotIndex,
  studentId,
  studentName,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [hold, setHold] = useState<BookingHold | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(MAX_HOLD_SECONDS);
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [domainError, setDomainError] = useState<DomainError | null>(null);
  const [quota, setQuota] = useState<StudentQuotaUsage | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdRef = useRef<BookingHold | null>(null);
  const slotDef = TIME_SLOT_DEFINITIONS[slotIndex];

  // 1. Initial Hold Creation & Quota Fetch
  const initiateHold = useCallback(async () => {
    setIsHolding(true);
    setDomainError(null);
    setSecondsRemaining(MAX_HOLD_SECONDS);

    try {
      // Fetch current quota usage
      const currentQuota = await bookingService.getStudentQuotaUsage(
        studentId,
        bookingDate
      );
      setQuota(currentQuota);

      // Create 90-second soft hold
      const holdRes = await bookingService.createHold(
        room.id,
        bookingDate,
        slotIndex,
        studentId
      );

      if (!holdRes.success) {
        setDomainError(mapErrorToDomain(holdRes.error));
        setIsHolding(false);
        return;
      }

      const activeHold = holdRes.hold || null;
      setHold(activeHold);
      holdRef.current = activeHold;
      setIsHolding(false);
    } catch (err: any) {
      setDomainError(mapErrorToDomain(err));
      setIsHolding(false);
    }
  }, [room.id, bookingDate, slotIndex, studentId]);

  // 2. Countdown Timer
  useEffect(() => {
    if (visible) {
      initiateHold();
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (holdRef.current) {
        bookingService.releaseHold(holdRef.current.id).catch(() => {});
        holdRef.current = null;
      }
      setHold(null);
      setDomainError(null);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (holdRef.current) {
        bookingService.releaseHold(holdRef.current.id).catch(() => {});
        holdRef.current = null;
      }
    };
  }, [visible, initiateHold]);

  useEffect(() => {
    if (!hold || secondsRemaining <= 0) return;

    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hold, secondsRemaining]);

  // 3. Clean release hold on dismiss
  const handleDismiss = useCallback(async () => {
    const currentHold = hold || holdRef.current;
    if (currentHold) {
      try {
        await bookingService.releaseHold(currentHold.id);
      } catch (e) {
        console.warn('Failed to release hold on modal dismiss', e);
      }
    }
    holdRef.current = null;
    setHold(null);
    onClose();
  }, [hold, onClose]);

  const { isConnected, isSimulatedOffline } = useNetworkStatus();
  const isOffline = !isConnected || isSimulatedOffline;

  // 4. Confirm Booking Transaction (Atomic book_slot or Outbox Queue if offline)
  const handleConfirm = async () => {
    if (secondsRemaining <= 0) {
      setDomainError(
        mapErrorToDomain({
          errorCode: 'HOLD_EXPIRED',
          message: t('holdExpiredAlert'),
        })
      );
      return;
    }

    setIsConfirming(true);
    setDomainError(null);

    // If offline: NEVER confirm locally! Add to outbox in PENDING_SYNC state
    if (isOffline) {
      const { pendingBooking } = outboxService.queueBooking(
        { id: room.id, name: room.name, building: room.building, floor: room.floor },
        bookingDate,
        slotIndex,
        studentId
      );
      setIsConfirming(false);
      onSuccess(pendingBooking, false);
      return;
    }

    const idempotencyKey = generateIdempotencyKey();

    try {
      const result = await bookingService.bookSlot({
        roomId: room.id,
        bookingDate,
        slotIndex,
        studentId,
        idempotencyKey,
      });

      if (!result.success || !result.booking) {
        setDomainError(
          mapErrorToDomain({
            errorCode: result.errorCode,
            message: result.errorMessage,
          })
        );
        setIsConfirming(false);
        return;
      }

      holdRef.current = null;
      setIsConfirming(false);
      onSuccess(result.booking, result.isReplay || false);
    } catch (err: any) {
      setDomainError(mapErrorToDomain(err));
      setIsConfirming(false);
    }
  };

  const isHoldExpired = secondsRemaining === 0;
  const isFatalError =
    domainError &&
    (domainError.code === 'SLOT_ALREADY_BOOKED' ||
      domainError.code === 'SLOT_HELD_BY_OTHER' ||
      domainError.code === 'OUTSIDE_BOOKING_HORIZON');

  // Localized Domain Error translation
  const getLocalizedErrorMessage = (err: DomainError): { title: string; message: string } => {
    switch (err.code) {
      case 'SLOT_ALREADY_BOOKED':
        return { title: t('errCannotBookTitle'), message: t('errSlotAlreadyBooked') };
      case 'SLOT_HELD_BY_OTHER':
        return { title: t('errCannotBookTitle'), message: t('errSlotHeldByOther') };
      case 'DAILY_QUOTA_EXCEEDED':
        return { title: t('errCannotBookTitle'), message: t('errDailyQuotaExceeded') };
      case 'WEEKLY_QUOTA_EXCEEDED':
        return { title: t('errCannotBookTitle'), message: t('errWeeklyQuotaExceeded') };
      case 'ACTIVE_BOOKING_LIMIT_EXCEEDED':
        return { title: t('errCannotBookTitle'), message: t('errActiveBookingLimitExceeded') };
      case 'OUTSIDE_BOOKING_HORIZON':
        return { title: t('errCannotBookTitle'), message: t('errOutsideBookingHorizon') };
      case 'HOLD_EXPIRED':
        return { title: t('softHoldExpiredText'), message: t('errHoldExpired') };
      case 'NETWORK_ERROR':
        return { title: t('actionError'), message: t('errNetworkError') };
      default:
        return { title: err.title || t('actionError'), message: err.message || t('errUnknown') };
    }
  };

  const localizedError = domainError ? getLocalizedErrorMessage(domainError) : null;
  const progressPercent = Math.max(0, Math.min(100, (secondsRemaining / MAX_HOLD_SECONDS) * 100));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdropPressable} onPress={handleDismiss} />
        <View style={styles.modalContent}>
          {/* Top Grabber Handle */}
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{t('confirmModalTitle')}</Text>
              <Text style={styles.subtitle}>VKU Smart Study Spaces</Text>
            </View>
            <TouchableOpacity
              onPress={handleDismiss}
              style={styles.closeButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel={t('close')}
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* 90-Second Soft Hold Countdown Bar */}
          <View
            style={[
              styles.holdCard,
              isHoldExpired ? styles.holdCardExpired : styles.holdCardActive,
            ]}
          >
            <View style={styles.holdRow}>
              <View style={styles.holdIconCircle}>
                <Text style={styles.holdIcon}>{isHoldExpired ? '⚠️' : '⏱️'}</Text>
              </View>
              <View style={styles.holdTextContainer}>
                <Text
                  style={[
                    styles.holdText,
                    isHoldExpired && styles.holdTextExpired,
                  ]}
                >
                  {isHoldExpired
                    ? t('softHoldExpiredText')
                    : `${t('softHoldActiveText')} ${secondsRemaining} ${t('holdSeconds')}`}
                </Text>
                <Text style={styles.holdSubtext}>
                  {isHoldExpired
                    ? t('holdExpiredAlert')
                    : 'Suất mượn được bảo lưu độc quyền cho bạn'}
                </Text>
              </View>
              {!isHoldExpired && (
                <View
                  style={[
                    styles.timerBadge,
                    secondsRemaining <= 15 && styles.timerBadgeWarning,
                  ]}
                >
                  <Text style={styles.timerBadgeText}>{secondsRemaining}s</Text>
                </View>
              )}
            </View>

            {/* Visual Progress Bar */}
            {!isHoldExpired && (
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${progressPercent}%`,
                      backgroundColor: secondsRemaining <= 15 ? '#ef4444' : '#0284c7',
                    },
                  ]}
                />
              </View>
            )}
          </View>

          {/* Booking Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.labelGroup}>
                <Text style={styles.iconPrefix}>🏢</Text>
                <Text style={styles.summaryLabel}>{t('roomDetails')}</Text>
              </View>
              <Text style={styles.summaryValue}>{room.name}</Text>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.labelGroup}>
                <Text style={styles.iconPrefix}>📍</Text>
                <Text style={styles.summaryLabel}>{t('locationLabel')}</Text>
              </View>
              <Text style={styles.summaryValue}>
                {t('buildingLabel')} {room.building} • {t('floor')} {room.floor}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.labelGroup}>
                <Text style={styles.iconPrefix}>📅</Text>
                <Text style={styles.summaryLabel}>{t('bookingDate')}</Text>
              </View>
              <Text style={styles.summaryValue}>
                {formatDisplayDate(bookingDate)}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.labelGroup}>
                <Text style={styles.iconPrefix}>⏰</Text>
                <Text style={styles.summaryLabel}>{t('bookingTime')}</Text>
              </View>
              <View style={styles.slotHighlightBadge}>
                <Text style={styles.summaryValueHighlight}>
                  {t('slotPrefix')} {slotIndex + 1} ({slotDef.label})
                </Text>
              </View>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.labelGroup}>
                <Text style={styles.iconPrefix}>👤</Text>
                <Text style={styles.summaryLabel}>{t('borrower')}</Text>
              </View>
              <Text style={styles.summaryValue}>{studentName}</Text>
            </View>
          </View>

          {/* Quota Usage Information */}
          {quota && (
            <View style={styles.quotaBox}>
              <View style={styles.quotaHeader}>
                <Text style={styles.quotaTitle}>📊 {t('quotaStatusTitle')}</Text>
                <Text style={styles.quotaSub}>Quy chuẩn sinh viên VKU</Text>
              </View>
              <View style={styles.quotaStatsRow}>
                <View style={styles.quotaStatItem}>
                  <Text style={styles.quotaStatLabel}>{t('today')}</Text>
                  <Text
                    style={[
                      styles.quotaStatValue,
                      quota.dailyUsage >= VKU_QUOTA_LIMITS.maxDailySlots && styles.quotaLimitHit,
                    ]}
                  >
                    {quota.dailyUsage}/{VKU_QUOTA_LIMITS.maxDailySlots}
                  </Text>
                </View>
                <View style={styles.quotaStatDivider} />
                <View style={styles.quotaStatItem}>
                  <Text style={styles.quotaStatLabel}>{t('thisWeek')}</Text>
                  <Text
                    style={[
                      styles.quotaStatValue,
                      quota.weeklyUsage >= VKU_QUOTA_LIMITS.maxWeeklySlots && styles.quotaLimitHit,
                    ]}
                  >
                    {quota.weeklyUsage}/{VKU_QUOTA_LIMITS.maxWeeklySlots}
                  </Text>
                </View>
                <View style={styles.quotaStatDivider} />
                <View style={styles.quotaStatItem}>
                  <Text style={styles.quotaStatLabel}>{t('activeFuture')}</Text>
                  <Text
                    style={[
                      styles.quotaStatValue,
                      quota.activeFutureCount >= VKU_QUOTA_LIMITS.maxActiveFutureBookings &&
                        styles.quotaLimitHit,
                    ]}
                  >
                    {quota.activeFutureCount}/{VKU_QUOTA_LIMITS.maxActiveFutureBookings}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Conflict or Domain Error Banner */}
          {localizedError && (
            <View style={styles.errorBanner}>
              <View style={styles.errorHeaderRow}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorTitle}>{localizedError.title}</Text>
              </View>
              <Text style={styles.errorMessage}>{localizedError.message}</Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            {isFatalError ? (
              <TouchableOpacity
                style={styles.selectAnotherButton}
                onPress={handleDismiss}
                activeOpacity={0.8}
              >
                <Text style={styles.selectAnotherText}>{t('selectAnotherSlot')}</Text>
              </TouchableOpacity>
            ) : isHoldExpired ? (
              <TouchableOpacity
                style={styles.retryHoldButton}
                onPress={initiateHold}
                activeOpacity={0.8}
              >
                <Text style={styles.retryHoldText}>{t('renewHoldBtn')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  (isConfirming || isHolding) && styles.buttonDisabled,
                ]}
                onPress={handleConfirm}
                disabled={isConfirming || isHolding}
                activeOpacity={0.8}
              >
                {isConfirming || isHolding ? (
                  <View style={styles.confirmingRow}>
                    <ActivityIndicator color="#ffffff" size="small" />
                    <Text style={styles.confirmText}>
                      {isHolding ? 'Đang tạo phiên giữ chỗ...' : t('bookingInProgress')}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.confirmText}>{t('confirmBookingBtn')}</Text>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleDismiss}
              disabled={isConfirming}
            >
              <Text style={styles.cancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  backdropPressable: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 38 : 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '700',
  },
  holdCard: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  holdCardActive: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  holdCardExpired: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  holdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  holdIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  holdIcon: {
    fontSize: 16,
  },
  holdTextContainer: {
    flex: 1,
  },
  holdText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369a1',
  },
  holdTextExpired: {
    color: '#b91c1c',
  },
  holdSubtext: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  timerBadge: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timerBadgeWarning: {
    backgroundColor: '#ef4444',
  },
  timerBadgeText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: '#e0f2fe',
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  summaryCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconPrefix: {
    fontSize: 13,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  slotHighlightBadge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  summaryValueHighlight: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284c7',
  },
  quotaBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginBottom: 12,
  },
  quotaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quotaTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803d',
  },
  quotaSub: {
    fontSize: 11,
    color: '#16a34a',
    fontWeight: '500',
  },
  quotaStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 2,
  },
  quotaStatItem: {
    alignItems: 'center',
  },
  quotaStatLabel: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '500',
  },
  quotaStatValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#14532d',
    marginTop: 2,
  },
  quotaLimitHit: {
    color: '#dc2626',
  },
  quotaStatDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#86efac',
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  errorIcon: {
    fontSize: 14,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#991b1b',
  },
  errorMessage: {
    fontSize: 12,
    color: '#b91c1c',
    lineHeight: 17,
  },
  actionRow: {
    gap: 8,
    marginTop: 4,
  },
  confirmButton: {
    backgroundColor: '#0284c7',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
  confirmingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confirmText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  retryHoldButton: {
    backgroundColor: '#d97706',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  retryHoldText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  selectAnotherButton: {
    backgroundColor: '#475569',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  selectAnotherText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  cancelButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
});
