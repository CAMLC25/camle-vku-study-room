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
  useWindowDimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
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
import { showConfirmDialog, showAlertDialog } from '../utils/dialog';
import { colors, layout, spacing, typography, shadows } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'RoomDetail'>;

export const RoomDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { roomId } = route.params;
  const { t, language } = useTranslation();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const insets = useSafeAreaInsets();

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
  const myBookings = useBookingStore((state) => state.myBookings);

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
        const myBooking = myBookings.find(
          (b) =>
            b.roomId === roomId &&
            b.bookingDate === selectedDate &&
            b.slotIndex === slotIndex &&
            b.status !== 'CANCELLED'
        );

        showConfirmDialog({
          title: t('yourReservationTitle'),
          message: `${t('yourReservationMsg')}\n${room?.name ? `${language === 'vi' ? 'Phòng' : 'Room'}: ${room.name}\n` : ''}${t('slotPrefix')} ${slotIndex + 1} (${TIME_SLOT_DEFINITIONS[slotIndex].label}) - ${formatDisplayDate(selectedDate)}`,
          type: 'info',
          isDestructive: false,
          confirmText: t('viewInMyBookings'),
          cancelText: t('close'),
          onConfirm: () =>
            navigation.navigate('MainTabs', {
              screen: 'MyBookings',
              params: {
                viewPassBookingId: myBooking?.id,
                viewSlotMatch: { roomId, date: selectedDate, slotIndex },
              },
            }),
          onCancel: () => {},
        });
      } else if (slot && slot.state === 'HELD_BY_OTHER') {
        showAlertDialog(
          t('heldByOtherTitle'),
          t('heldByOtherMsg')
        );
      }
    },
    [slots, selectedDate, t, room, language, navigation, myBookings, roomId]
  );

  const handleBookingSuccess = useCallback(
    async (booking: Booking, isReplay: boolean) => {
      setModalSlotIndex(null);
      addBooking(booking);

      if (booking.status === 'PENDING_SYNC') {
        showConfirmDialog({
          title: t('bookingQueuedOfflineTitle'),
          message: `${t('bookingQueuedOfflineMsg')}\n\n${language === 'vi' ? 'Phòng' : 'Room'}: ${booking.roomName}`,
          confirmText: t('viewInMyBookings'),
          cancelText: t('close'),
          onConfirm: () => navigation.navigate('MainTabs', { screen: 'MyBookings' }),
        });
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

      showConfirmDialog({
        title: isReplay ? t('bookingAlreadyActiveTitle') : t('reservationConfirmedTitle'),
        message: `${language === 'vi' ? 'Phòng' : 'Room'}: ${booking.roomName}\n${t('bookingDate')}: ${formatDisplayDate(booking.bookingDate)}\n${t('bookingTime')}: ${TIME_SLOT_DEFINITIONS[booking.slotIndex].label}`,
        confirmText: t('viewInMyBookings'),
        cancelText: t('close'),
        onConfirm: () =>
          navigation.navigate('MainTabs', {
            screen: 'MyBookings',
            params: { viewPassBookingId: booking.id },
          }),
      });
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 32 }}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar style="light" />

      {/* Desktop Top Breadcrumb & Back Navigation */}
      {isDesktop && (
        <View style={styles.desktopBreadcrumbRow}>
          <TouchableOpacity
            style={styles.desktopBackBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.desktopBackBtnText}>
              ← {t('back')} ({language === 'vi' ? 'Danh sách phòng' : 'Rooms'})
            </Text>
          </TouchableOpacity>
          <Text style={styles.desktopBreadcrumbCurrent}>/ {room.name}</Text>
        </View>
      )}

      {/* Mobile Only: Hero Room Image with Floating Back Button */}
      {!isDesktop && (
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: room.photoUrl }}
            style={styles.heroImage}
            contentFit="cover"
            transition={250}
            cachePolicy="disk"
          />
          <TouchableOpacity
            style={[
              styles.floatingBackButton,
              { top: insets.top > 0 ? insets.top + 8 : 16 },
            ]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('back')}
            accessibilityHint="Navigates back to room list"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.floatingBackText}>‹</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Layout Container (Desktop 2-column or Mobile 1-column) */}
      <View style={[styles.mainLayout, isDesktop && styles.mainLayoutDesktop]}>
        {/* Left Column on Desktop / Top on Mobile */}
        <View style={[styles.leftCol, isDesktop && styles.leftColDesktop]}>
          {/* Desktop Only: Contained Hero Image with Rounded Corners */}
          {isDesktop && (
            <View style={styles.heroContainerDesktop}>
              <Image
                source={{ uri: room.photoUrl }}
                style={styles.heroImage}
                contentFit="cover"
                transition={250}
                cachePolicy="disk"
              />
            </View>
          )}

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
              👥 {t('maxCapacity')}:{' '}
              <Text style={styles.capacityHighlight}>
                {room.capacity} {t('students')}
              </Text>
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
        </View>

        {/* Right Column on Desktop / Bottom on Mobile */}
        <View style={[styles.rightCol, isDesktop && styles.rightColDesktop]}>
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
              onRefresh={refresh}
            />
          </View>
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
    backgroundColor: colors.background,
  },
  desktopBreadcrumbRow: {
    maxWidth: 1140,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
    gap: 10,
  },
  desktopBackBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  desktopBackBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284c7',
  },
  desktopBreadcrumbCurrent: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  mainLayout: {
    width: '100%',
    alignSelf: 'center',
  },
  mainLayoutDesktop: {
    maxWidth: 1140,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 24,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xs,
  },
  leftCol: {
    width: '100%',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
  },
  leftColDesktop: {
    width: 440,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  rightCol: {
    width: '100%',
    paddingHorizontal: spacing.base,
  },
  rightColDesktop: {
    flex: 1,
    paddingHorizontal: 0,
  },
  heroContainerDesktop: {
    width: '100%',
    height: 270,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: spacing.md,
    backgroundColor: colors.borderStrong,
  },
  heroContainer: {
    width: '100%',
    height: 230,
    position: 'relative',
    backgroundColor: colors.borderStrong,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  floatingBackButton: {
    position: 'absolute',
    left: spacing.base,
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: layout.minTouchTarget / 2,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  floatingBackText: {
    color: colors.textInverse,
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 30,
    marginTop: -2,
    textAlign: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    padding: spacing.base,
  },
  titleSection: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: layout.radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  roomName: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.extrabold,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  buildingBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: layout.radii.sm,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  buildingBadgeText: {
    color: colors.primaryDark,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  capacityText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  capacityHighlight: {
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  equipmentSection: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: layout.radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  sectionLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  equipmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  equipmentChip: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
    borderRadius: layout.radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  equipmentChipText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  slotSection: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: layout.radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
    ...shadows.card,
  },
  slotHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dateLabel: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncText: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  notFoundText: {
    fontSize: typography.sizes.base,
    color: colors.textMuted,
    marginBottom: spacing.base,
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: layout.radii.sm,
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: colors.textInverse,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.base,
  },
});
