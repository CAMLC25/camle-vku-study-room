import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Booking } from '../types/booking';
import { TIME_SLOT_DEFINITIONS } from '../types/slot';
import { formatDisplayDate } from '../utils/date';
import { useTranslation } from '../store/useLanguageStore';

interface BookingPassModalProps {
  booking: Booking | null;
  visible: boolean;
  onClose: () => void;
}

export const BookingPassModal: React.FC<BookingPassModalProps> = ({
  booking,
  visible,
  onClose,
}) => {
  const { t } = useTranslation();

  if (!booking || booking.status !== 'CONFIRMED') {
    return null;
  }

  const slotDef = TIME_SLOT_DEFINITIONS[booking.slotIndex];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.ticketCard}>
          {/* Top Banner */}
          <View style={styles.banner}>
            <View style={styles.universityBadge}>
              <Text style={styles.universityText}>{t('vkuPassBadge')}</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>{t('verifiedBadge')}</Text>
            </View>
          </View>

          {/* Room & Time Details */}
          <View style={styles.headerContent}>
            <Text style={styles.roomName}>{booking.roomName}</Text>
            <Text style={styles.location}>
              {t('buildingLabel')} {booking.building} • {t('floor')} {booking.floor}
            </Text>
          </View>

          {/* Ticket Perforation Notch */}
          <View style={styles.perforationRow}>
            <View style={styles.notchLeft} />
            <View style={styles.dashedLine} />
            <View style={styles.notchRight} />
          </View>

          {/* Session Details */}
          <View style={styles.detailsBody}>
            <View style={styles.infoRow}>
              <View>
                <Text style={styles.infoLabel}>{t('bookingDate')}</Text>
                <Text style={styles.infoValue}>
                  {formatDisplayDate(booking.bookingDate)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.infoLabel}>{t('bookingTime')}</Text>
                <Text style={styles.infoValueHighlight}>
                  {slotDef?.label}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View>
                <Text style={styles.infoLabel}>{t('borrower')}</Text>
                <Text style={styles.infoValue}>
                  {booking.studentName || 'VKU Student'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.infoLabel}>{t('slotPrefix')}</Text>
                <Text style={styles.infoValue}>
                  {t('slotPrefix')} {booking.slotIndex + 1}
                </Text>
              </View>
            </View>

            {/* QR Code Container (Payload strictly contains only bookingId) */}
            <View style={styles.qrContainer}>
              <View style={styles.qrBox}>
                <QRCode
                  value={booking.id}
                  size={170}
                  color="#0f172a"
                  backgroundColor="#ffffff"
                />
              </View>
              <Text style={styles.qrInstructions}>
                {t('qrPassSubtitle')}
              </Text>
              <Text style={styles.bookingIdText}>
                {t('qrBookingId')}: {booking.id}
              </Text>
            </View>
          </View>

          {/* Close Action */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('close')}
          >
            <Text style={styles.closeButtonText}>{t('close')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  ticketCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  banner: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  universityBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  universityText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  verifiedBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '800',
  },
  headerContent: {
    padding: 20,
    paddingBottom: 16,
    backgroundColor: '#f8fafc',
  },
  roomName: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0f172a',
  },
  location: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 3,
  },
  perforationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    backgroundColor: '#f8fafc',
    position: 'relative',
  },
  notchLeft: {
    width: 14,
    height: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  notchRight: {
    width: 14,
    height: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    marginHorizontal: 8,
  },
  detailsBody: {
    padding: 20,
    paddingTop: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 2,
  },
  infoValueHighlight: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0284c7',
    marginTop: 2,
  },
  qrContainer: {
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  qrBox: {
    padding: 10,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  qrInstructions: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 10,
    textAlign: 'center',
  },
  bookingIdText: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 4,
  },
  closeButton: {
    backgroundColor: '#0f172a',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
