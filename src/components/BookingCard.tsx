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
          icon: '✓',
          label: t('tabActive'),
          bg: '#ecfdf5',
          color: '#059669',
          borderColor: '#a7f3d0',
        };
      case 'PENDING_SYNC':
        return {
          icon: '⏳',
          label: t('tabPending'),
          bg: '#faf5ff',
          color: '#7e22ce',
          borderColor: '#e9d5ff',
        };
      case 'CONFLICTED':
        return {
          icon: '⚠️',
          label: t('tabConflicted'),
          bg: '#fef2f2',
          color: '#dc2626',
          borderColor: '#fca5a5',
        };
      case 'CANCELLED':
      default:
        return {
          icon: '✕',
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
      {/* Ticket Header */}
      <View style={styles.topRow}>
        <View style={styles.roomInfo}>
          <Text style={styles.roomName}>{booking.roomName}</Text>
          <Text style={styles.location}>
            📍 {t('buildingLabel')} {booking.building} • {t('floor')} {booking.floor}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: badge.bg, borderColor: badge.borderColor },
          ]}
        >
          <Text style={[styles.statusIcon, { color: badge.color }]}>{badge.icon}</Text>
          <Text style={[styles.statusText, { color: badge.color }]}>
            {badge.label}
          </Text>
        </View>
      </View>

      {/* Ticket Perforation Notch & Dashed Line */}
      <View style={styles.perforationContainer}>
        <View style={styles.perforationNotchLeft} />
        <View style={styles.perforationDashedLine} />
        <View style={styles.perforationNotchRight} />
      </View>

      {/* Ticket Body / Meta */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>📅 {t('bookingDate')}</Text>
          <Text style={styles.metaValue}>
            {formatDisplayDate(booking.bookingDate)}
          </Text>
        </View>

        <View style={styles.metaItemRight}>
          <Text style={styles.metaLabel}>⏰ {t('bookingTime')}</Text>
          <View style={styles.slotPill}>
            <Text style={styles.metaValueHighlight}>
              {t('slotPrefix')} {booking.slotIndex + 1} ({slotDef?.label})
            </Text>
          </View>
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
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('viewQRPassBtn')}
          >
            <Text style={styles.passButtonIcon}>🎟️</Text>
            <Text style={styles.passButtonText}>{t('viewQRPassBtn')}</Text>
          </TouchableOpacity>
        )}

        {isConfirmed && onCancel && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => onCancel(booking.id)}
            activeOpacity={0.8}
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
            activeOpacity={0.8}
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardPending: {
    backgroundColor: '#fbf8ff',
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
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  location: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 3,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusIcon: {
    fontSize: 11,
    fontWeight: '800',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  perforationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    position: 'relative',
  },
  perforationNotchLeft: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    marginLeft: -22,
  },
  perforationDashedLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    marginHorizontal: 8,
  },
  perforationNotchRight: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    borderLeftWidth: 1,
    borderLeftColor: '#e2e8f0',
    marginRight: -22,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  metaItem: {
    gap: 2,
  },
  metaItemRight: {
    alignItems: 'flex-end',
    gap: 3,
  },
  metaLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  slotPill: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  metaValueHighlight: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284c7',
  },
  conflictNotice: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    marginBottom: 12,
  },
  conflictTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#991b1b',
    marginBottom: 3,
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
    gap: 10,
  },
  passButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284c7',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#0284c7',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  passButtonIcon: {
    fontSize: 13,
  },
  passButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
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
    paddingVertical: 9,
    borderRadius: 10,
  },
  resolveButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  pendingHint: {
    fontSize: 11,
    color: '#7e22ce',
    fontStyle: 'italic',
  },
});
