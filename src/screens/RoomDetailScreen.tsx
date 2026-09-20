import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import { RootStackParamList } from '../navigation/types';
import { useBookingStore } from '../store/useBookingStore';
import { useRoomAvailability } from '../hooks/useRoomAvailability';
import { useTranslation } from '../store/useLanguageStore';
import { DateSelector } from '../components/DateSelector';
import { SlotGrid } from '../components/SlotGrid';
import { ConfirmBookingModal } from '../components/ConfirmBookingModal';
import { SlotIndex, TIME_SLOT_DEFINITIONS } from '../types/slot';
import { Booking } from '../types/booking';
import { formatDisplayDate } from '../utils/date';
import { bookingService } from '../services/bookingService';
import { notificationService } from '../services/notificationService';

type Props = NativeStackScreenProps<RootStackParamList, 'RoomDetail'>;

export const RoomDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { roomId } = route.params;
  const { t, language } = useTranslation();

  // Narrow Zustand selectors
  const room = useBookingStore((state) =>
    state.rooms.find((r) => r.id === roomId)
  );
  const selectedDate = useBookingStore((state) => state.selectedDate);
  const setSelectedDate = useBookingStore((state) => state.setSelectedDate);
  const currentStudentId = useBookingStore((state) => state.currentStudentId);
  const currentStudentName = useBookingStore((state) => state.currentStudentName);
  const addBooking = useBookingStore((state) => state.addBooking);
  const updateBooking = useBookingStore((state) => state.updateBooking);
  const setQuotaUsage = useBookingStore((state) => state.setQuotaUsage);

  // Scoped Realtime availability hook
  const {
    slots,
    isLoading,
    refresh,
    simulateRemoteBooking,
  } = useRoomAvailability(roomId, selectedDate);

  // Modal State for 90-second soft hold
  const [modalSlotIndex, setModalSlotIndex] = useState<SlotIndex | null>(null);

  const handleSelectSlot = useCallback(
    (slotIndex: SlotIndex) => {
      const slot = slots[slotIndex];
      if (slot && slot.state === 'AVAILABLE') {
        setModalSlotIndex(slotIndex);
      } else if (slot && slot.state === 'MINE') {
        Alert.alert(
          t('yourReservationTitle'),
          `${t('yourReservationMsg')}\n${t('slotPrefix')} ${slotIndex + 1} (${TIME_SLOT_DEFINITIONS[slotIndex].label}) - ${formatDisplayDate(selectedDate)}`,
          [{ text: 'OK' }]
        );
      } else if (slot && slot.state === 'HELD_BY_OTHER') {
        Alert.alert(
          t('heldByOtherTitle'),
          t('heldByOtherMsg'),
          [{ text: 'OK' }]
        );
      }
    },
    [slots, selectedDate, t]
  );

  const handleBookingSuccess = useCallback(
    async (booking: Booking, isReplay: boolean) => {
      setModalSlotIndex(null);
      addBooking(booking);

      if (booking.status === 'PENDING_SYNC') {
        Alert.alert(
          t('bookingQueuedOfflineTitle'),
          `${t('bookingQueuedOfflineMsg')}\n\n${language === 'vi' ? 'Phòng' : 'Room'}: ${booking.roomName}`,
          [
            {
              text: t('viewInMyBookings'),
              onPress: () => navigation.navigate('MainTabs', { screen: 'MyBookings' }),
            },
            { text: 'OK', style: 'cancel' },
          ]
        );
        return;
      }

      // Schedule local 15-minute reminder for confirmed booking
      try {
        const notifId = await notificationService.scheduleSlotReminder(booking);
        if (notifId) {
          updateBooking(booking.id, { notificationId: notifId });
        }
      } catch (e) {
        console.warn('Failed to schedule reminder', e);
      }

      // Refresh quota in background
      try {
        const freshQuota = await bookingService.getStudentQuotaUsage(
          currentStudentId,
          selectedDate
        );
        setQuotaUsage(freshQuota);
      } catch (e) {
        console.warn('Failed to refresh quota after booking', e);
      }

      // Refresh slot states
      await refresh();

      Alert.alert(
        isReplay ? t('bookingAlreadyActiveTitle') : t('reservationConfirmedTitle'),
        `${language === 'vi' ? 'Phòng' : 'Room'}: ${booking.roomName}\n${t('bookingDate')}: ${formatDisplayDate(booking.bookingDate)}\n${t('bookingTime')}: ${TIME_SLOT_DEFINITIONS[booking.slotIndex].label}`,
        [
          {
            text: t('viewInMyBookings'),
            onPress: () => navigation.navigate('MainTabs', { screen: 'MyBookings' }),
          },
          { text: t('close'), style: 'cancel' },
        ]
      );
    },
    [addBooking, updateBooking, currentStudentId, selectedDate, setQuotaUsage, refresh, navigation, t, language]
  );

const getEquipmentIcon = (eq: string): string => {
  const lower = eq.toLowerCase();
  if (lower.includes('projector') || lower.includes('chiếu')) return '📽️';
  if (lower.includes('pc') || lower.includes('máy tính')) return '🖥️';
  if (lower.includes('whiteboard') || lower.includes('bảng')) return '📋';
  if (lower.includes('air') || lower.includes('điều hòa')) return '❄️';
  return '⚡';
};

  if (!room) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.notFoundText}>{t('roomNotFound')}</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>{t('back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Room Image with Floating Back Button */}
      <View style={styles.heroContainer}>
        <Image
          source={{ uri: room.photoUrl }}
          style={styles.heroImage}
          contentFit="cover"
          transition={250}
          cachePolicy="disk"
        />
        <TouchableOpacity
          style={styles.floatingBackButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('back')}
        >
          <Text style={styles.floatingBackText}>‹</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Room Header Info */}
        <View style={styles.titleSection}>
          <View style={styles.nameRow}>
            <Text style={styles.roomName}>{room.name}</Text>
            <View style={styles.buildingBadge}>
              <Text style={styles.buildingBadgeText}>
                📍 {t('buildingLabel')} {room.building} • {t('floor')} {room.floor}
              </Text>
            </View>
          </View>
          <Text style={styles.capacityText}>
            👥 {t('maxCapacity')}: <Text style={styles.capacityHighlight}>{room.capacity} {t('students')}</Text>
          </Text>
        </View>

        {/* Equipment Chips */}
        <View style={styles.equipmentSection}>
          <Text style={styles.sectionLabel}>{t('equipmentTitle')}:</Text>
          <View style={styles.equipmentRow}>
            {room.equipment.map((eq) => (
              <View key={eq} style={styles.equipmentChip}>
                <Text style={styles.equipmentChipText}>
                  {getEquipmentIcon(eq)} {eq}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* 7-Day Horizon Date Selector */}
        <DateSelector
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />

        {/* Realtime Availability Grid */}
        <View style={styles.slotSection}>
          <View style={styles.slotHeaderRow}>
            <Text style={styles.dateLabel}>
              {formatDisplayDate(selectedDate)}
            </Text>
            {isLoading && (
              <View style={styles.syncRow}>
                <ActivityIndicator size="small" color="#0284c7" />
                <Text style={styles.syncText}>{t('syncingRealtime')}</Text>
              </View>
            )}
          </View>

          <SlotGrid
            slots={slots}
            onSelectSlot={handleSelectSlot}
          />
        </View>
      </View>

      {/* Confirm Booking Modal with 90-Second Soft Hold */}
      {modalSlotIndex !== null && (
        <ConfirmBookingModal
          visible={modalSlotIndex !== null}
          room={room}
          bookingDate={selectedDate}
          slotIndex={modalSlotIndex}
          studentId={currentStudentId}
          studentName={currentStudentName}
          onClose={() => {
            setModalSlotIndex(null);
            refresh();
          }}
          onSuccess={handleBookingSuccess}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  heroContainer: {
    width: '100%',
    height: 230,
    position: 'relative',
    backgroundColor: '#cbd5e1',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  floatingBackButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 36,
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  floatingBackText: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '300',
    lineHeight: 28,
    textAlign: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  titleSection: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  roomName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
  },
  buildingBadge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  buildingBadgeText: {
    color: '#0369a1',
    fontSize: 12,
    fontWeight: '700',
  },
  capacityText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  capacityHighlight: {
    fontWeight: '700',
    color: '#0f172a',
  },
  equipmentSection: {
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  equipmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  equipmentChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  equipmentChipText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },
  slotSection: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 12,
  },
  slotHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncText: {
    fontSize: 11,
    color: '#0284c7',
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  notFoundText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
