import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Booking } from '../types/booking';
import { TIME_SLOT_DEFINITIONS } from '../types/slot';
import { formatDisplayDate } from '../utils/date';
import { useTranslation } from '../store/useLanguageStore';

interface BookingCardProps {
  booking: Booking;
  onCancel?: (bookingId: string) => void;
  onViewPass?: (bookingId: string) => void;
  onResolveConflict?: (booking: Booking) => void;
}

export const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  onCancel,
  onViewPass,
  onResolveConflict,
}) => {
  const { t } = useTranslation();
  const slotDef = TIME_SLOT_DEFINITIONS[booking.slotIndex];

  const getStatusBadgeConfig = () => {
    switch (booking.status) {
      case 'CONFIRMED':
        return {
          label: t('tabActive'),
          bg: '#ecfdf5',
          color: '#059669',
          borderColor: '#a7f3d0',
        };
      case 'PENDING_SYNC':
        return {
          label: t('tabPending'),
          bg: '#faf5ff',
          color: '#7e22ce',
          borderColor: '#e9d5ff',
        };
      case 'CONFLICTED':
        return {
          label: t('tabConflicted'),
          bg: '#fef2f2',
          color: '#dc2626',
          borderColor: '#fca5a5',
        };
      case 'CANCELLED':
      default:
        return {
          label: t('tabCancelled'),
          bg: '#f1f5f9',
          color: '#64748b',
          borderColor: '#e2e8f0',
        };
    }
  };

  const badge = getStatusBadgeConfig();
  const isConfirmed = booking.status === 'CONFIRMED';
  const isPendingSync = booking.status === 'PENDING_SYNC';
  const isConflicted = booking.status === 'CONFLICTED';

  return (
    <View
      style={[
        styles.card,
        isPendingSync && styles.cardPending,
        isConflicted && styles.cardConflicted,
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.roomInfo}>
          <Text style={styles.roomName}>{booking.roomName}</Text>
          <Text style={styles.location}>
            {t('buildingLabel')} {booking.building} • {t('floor')} {booking.floor}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: badge.bg, borderColor: badge.borderColor },
          ]}
        >
          <Text style={[styles.statusText, { color: badge.color }]}>
            {badge.label}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>{t('bookingDate')}:</Text>
          <Text style={styles.metaValue}>
            {formatDisplayDate(booking.bookingDate)}
          </Text>
        </View>

        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>{t('bookingTime')}:</Text>
          <Text style={styles.metaValueHighlight}>
            {t('slotPrefix')} {booking.slotIndex + 1} ({slotDef?.label})
          </Text>
        </View>
      </View>

      {/* Conflicted Warning Banner */}
      {isConflicted && (
        <View style={styles.conflictNotice}>
          <Text style={styles.conflictTitle}>{t('conflictNoticeTitle')}</Text>
          <Text style={styles.conflictText}>
            {t('conflictNoticeText')}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        {isConfirmed && onViewPass && (
          <TouchableOpacity
            style={styles.passButton}
            onPress={() => onViewPass(booking.id)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('viewQRPassBtn')}
          >
            <Text style={styles.passButtonText}>{t('viewQRPassBtn')}</Text>
          </TouchableOpacity>
        )}

        {isConfirmed && onCancel && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => onCancel(booking.id)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('cancelBookingBtn')}
          >
            <Text style={styles.cancelButtonText}>{t('cancelBookingBtn')}</Text>
          </TouchableOpacity>
        )}

        {isConflicted && onResolveConflict && (
          <TouchableOpacity
            style={styles.resolveButton}
            onPress={() => onResolveConflict(booking)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('findAlternativeSlot')}
          >
            <Text style={styles.resolveButtonText}>{t('findAlternativeSlot')}</Text>
          </TouchableOpacity>
        )}

        {isPendingSync && (
          <Text style={styles.pendingHint}>
            {t('pendingSyncHint')}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardPending: {
    backgroundColor: '#faf5ff',
    borderColor: '#d8b4fe',
  },
  cardConflicted: {
    backgroundColor: '#fff5f5',
    borderColor: '#fca5a5',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  location: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metaItem: {
    gap: 2,
  },
  metaLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  metaValueHighlight: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284c7',
  },
  conflictNotice: {
    backgroundColor: '#fef2f2',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
    marginBottom: 12,
  },
  conflictTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#991b1b',
    marginBottom: 2,
  },
  conflictText: {
    fontSize: 11,
    color: '#b91c1c',
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  passButton: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
  },
  passButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelButtonText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },
  resolveButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
  },
  resolveButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  pendingHint: {
    fontSize: 11,
    color: '#7e22ce',
    fontStyle: 'italic',
  },
});
