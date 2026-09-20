import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
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
  const [hold, setHold] = useState<BookingHold | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(90);
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [domainError, setDomainError] = useState<DomainError | null>(null);
  const [quota, setQuota] = useState<StudentQuotaUsage | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const slotDef = TIME_SLOT_DEFINITIONS[slotIndex];

  // 1. Initial Hold Creation & Quota Fetch
  const initiateHold = useCallback(async () => {
    setIsHolding(true);
    setDomainError(null);
    setSecondsRemaining(90);

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

      setHold(holdRes.hold || null);
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
      setHold(null);
      setDomainError(null);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
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
    if (hold && secondsRemaining > 0) {
      try {
        await bookingService.releaseHold(hold.id);
      } catch (e) {
        console.warn('Failed to release hold on modal dismiss', e);
      }
    }
    onClose();
  }, [hold, secondsRemaining, onClose]);

  const { isConnected, isSimulatedOffline } = useNetworkStatus();
  const isOffline = !isConnected || isSimulatedOffline;

  // 4. Confirm Booking Transaction (Atomic book_slot or Outbox Queue if offline)
  const handleConfirm = async () => {
    if (secondsRemaining <= 0) {
      setDomainError(
        mapErrorToDomain({
          errorCode: 'HOLD_EXPIRED',
          message: 'Your hold has expired. Please re-hold the slot.',
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

      setIsConfirming(false);
      onSuccess(result.booking, result.isReplay || false);
    } catch (err: any) {
      setDomainError(mapErrorToDomain(err));
      setIsConfirming(false);
    }
  };

  const isHoldExpired = secondsRemaining === 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Confirm Reservation</Text>
            <TouchableOpacity
              onPress={handleDismiss}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Soft Hold Countdown Banner */}
          <View
            style={[
              styles.holdBanner,
              isHoldExpired ? styles.holdBannerExpired : styles.holdBannerActive,
            ]}
          >
            <View style={styles.holdRow}>
              <Text style={styles.holdIcon}>⏱️</Text>
              <Text
                style={[
                  styles.holdText,
                  isHoldExpired && styles.holdTextExpired,
                ]}
              >
                {isHoldExpired
                  ? 'Soft hold expired'
                  : `Reserved for you for ${secondsRemaining}s`}
              </Text>
            </View>
            {!isHoldExpired && (
              <View style={styles.timerBadge}>
                <Text style={styles.timerBadgeText}>{secondsRemaining}s</Text>
              </View>
            )}
          </View>

          {/* Booking Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Room:</Text>
              <Text style={styles.summaryValue}>{room.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Location:</Text>
              <Text style={styles.summaryValue}>
                Building {room.building} • Floor {room.floor}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Date:</Text>
              <Text style={styles.summaryValue}>
                {formatDisplayDate(bookingDate)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Time Slot:</Text>
              <Text style={styles.summaryValueHighlight}>
                Slot {slotIndex + 1} ({slotDef.label})
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Student:</Text>
              <Text style={styles.summaryValue}>{studentName}</Text>
            </View>
          </View>

          {/* Quota Usage Information */}
          {quota && (
            <View style={styles.quotaBox}>
              <Text style={styles.quotaTitle}>Your Quota Status</Text>
              <View style={styles.quotaStatsRow}>
                <View style={styles.quotaStatItem}>
                  <Text style={styles.quotaStatLabel}>Today</Text>
                  <Text style={styles.quotaStatValue}>
                    {quota.dailyUsage} / {VKU_QUOTA_LIMITS.maxDailySlots}
                  </Text>
                </View>
                <View style={styles.quotaStatDivider} />
                <View style={styles.quotaStatItem}>
                  <Text style={styles.quotaStatLabel}>This Week</Text>
                  <Text style={styles.quotaStatValue}>
                    {quota.weeklyUsage} / {VKU_QUOTA_LIMITS.maxWeeklySlots}
                  </Text>
                </View>
                <View style={styles.quotaStatDivider} />
                <View style={styles.quotaStatItem}>
                  <Text style={styles.quotaStatLabel}>Active Future</Text>
                  <Text style={styles.quotaStatValue}>
                    {quota.activeFutureCount} / {VKU_QUOTA_LIMITS.maxActiveFutureBookings}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Conflict or Domain Error Banner */}
          {domainError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorTitle}>{domainError.title}</Text>
              <Text style={styles.errorMessage}>{domainError.message}</Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            {isHoldExpired ? (
              <TouchableOpacity
                style={styles.retryHoldButton}
                onPress={initiateHold}
                activeOpacity={0.8}
              >
                <Text style={styles.retryHoldText}>Renew 90s Hold</Text>
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
                {isConfirming ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.confirmText}>Confirm Reservation</Text>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleDismiss}
              disabled={isConfirming}
            >
              <Text style={styles.cancelText}>Cancel</Text>
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
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
  },
  holdBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 14,
  },
  holdBannerActive: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  holdBannerExpired: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  holdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  holdIcon: {
    fontSize: 14,
  },
  holdText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1d4ed8',
  },
  holdTextExpired: {
    color: '#b91c1c',
  },
  timerBadge: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  timerBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  summaryCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  summaryValueHighlight: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284c7',
  },
  quotaBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginBottom: 12,
  },
  quotaTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803d',
    marginBottom: 6,
  },
  quotaStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  quotaStatItem: {
    alignItems: 'center',
  },
  quotaStatLabel: {
    fontSize: 11,
    color: '#166534',
  },
  quotaStatValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#14532d',
    marginTop: 2,
  },
  quotaStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#86efac',
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991b1b',
    marginBottom: 2,
  },
  errorMessage: {
    fontSize: 12,
    color: '#b91c1c',
  },
  actionRow: {
    gap: 8,
    marginTop: 6,
  },
  confirmButton: {
    backgroundColor: '#0284c7',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  retryHoldButton: {
    backgroundColor: '#d97706',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
  },
  retryHoldText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
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
