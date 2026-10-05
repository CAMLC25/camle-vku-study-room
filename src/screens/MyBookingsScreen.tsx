import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeScreen } from '../components/layout/SafeScreen';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, MainTabParamList } from '../navigation/types';
import { useBookingStore } from '../store/useBookingStore';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { BookingCard } from '../components/BookingCard';
import { BookingPassModal } from '../components/BookingPassModal';
import { NetworkBanner } from '../components/NetworkBanner';
import { EmptyState } from '../components/EmptyState';
import { Booking } from '../types/booking';
import { bookingService } from '../services/bookingService';
import { outboxService } from '../services/outboxService';
import { notificationService } from '../services/notificationService';
import { useTranslation } from '../store/useLanguageStore';
import { showConfirmDialog, showAlertDialog } from '../utils/dialog';
import { colors, layout, spacing, typography, shadows } from '../theme/theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'MyBookings'>,
  NativeStackScreenProps<RootStackParamList>
>;

type FilterTab = 'ALL' | 'ACTIVE' | 'PENDING' | 'CONFLICTED' | 'CANCELLED';

export const MyBookingsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { t, language } = useTranslation();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [passBooking, setPassBooking] = useState<Booking | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const myBookings = useBookingStore((state) => state.myBookings);

  // Automatically open QR Check-in Pass Modal when navigated with booking parameters
  useEffect(() => {
    const viewPassBookingId = route.params?.viewPassBookingId;
    const viewSlotMatch = route.params?.viewSlotMatch;

    if (!viewPassBookingId && !viewSlotMatch) return;

    let target: Booking | undefined;
    if (viewPassBookingId) {
      target = myBookings.find((b) => b.id === viewPassBookingId);
    }
    if (!target && viewSlotMatch) {
      target = myBookings.find(
        (b) =>
          b.roomId === viewSlotMatch.roomId &&
          b.bookingDate === viewSlotMatch.date &&
          b.slotIndex === viewSlotMatch.slotIndex &&
          b.status !== 'CANCELLED'
      );
    }

    if (target) {
      if (target.status === 'CONFIRMED') {
        setActiveTab((prev) =>
          prev === 'PENDING' || prev === 'CONFLICTED' || prev === 'CANCELLED' ? 'ACTIVE' : prev
        );
        setPassBooking(target);
      }
      navigation.setParams({ viewPassBookingId: undefined, viewSlotMatch: undefined });
    }
  }, [route.params?.viewPassBookingId, route.params?.viewSlotMatch, myBookings, navigation]);
  const currentStudentId = useBookingStore((state) => state.currentStudentId);
  const updateBooking = useBookingStore((state) => state.updateBooking);
  const setMyBookings = useBookingStore((state) => state.setMyBookings);
  const { isConnected, isSimulatedOffline } = useNetworkStatus();

  const isOffline = !isConnected || isSimulatedOffline;

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (!isOffline) {
        const fresh = await bookingService.getMyBookings(currentStudentId);
        const pendingSyncs = myBookings.filter((b) => b.status === 'PENDING_SYNC');
        const merged = [
          ...pendingSyncs,
          ...fresh.filter((fb) => !pendingSyncs.some((pb) => pb.id === fb.id)),
        ];
        setMyBookings(merged);
      }
    } catch (e) {
      console.warn('Failed to refresh bookings:', e);
    } finally {
      setIsRefreshing(false);
    }
  }, [isOffline, currentStudentId, myBookings, setMyBookings]);

  // Tabs with counts
  const tabCounts = useMemo(() => {
    return {
      ALL: myBookings.length,
      ACTIVE: myBookings.filter((b) => b.status === 'CONFIRMED').length,
      PENDING: myBookings.filter((b) => b.status === 'PENDING_SYNC').length,
      CONFLICTED: myBookings.filter((b) => b.status === 'CONFLICTED').length,
      CANCELLED: myBookings.filter((b) => b.status === 'CANCELLED').length,
    };
  }, [myBookings]);

  // Filtered list
  const filteredBookings = useMemo(() => {
    switch (activeTab) {
      case 'ACTIVE':
        return myBookings.filter((b) => b.status === 'CONFIRMED');
      case 'PENDING':
        return myBookings.filter((b) => b.status === 'PENDING_SYNC');
      case 'CONFLICTED':
        return myBookings.filter((b) => b.status === 'CONFLICTED');
      case 'CANCELLED':
        return myBookings.filter((b) => b.status === 'CANCELLED');
      case 'ALL':
      default:
        return myBookings;
    }
  }, [myBookings, activeTab]);

  // Cancellation Flow (Online direct or Offline queued via Outbox)
  const handleCancelBooking = useCallback(
    (bookingId: string) => {
      const booking = myBookings.find((b) => b.id === bookingId);
      if (!booking) return;

      showConfirmDialog({
        title: t('cancelConfirmTitle'),
        message: `${t('cancelConfirmMsg')}\n(${booking.roomName})`,
        cancelText: t('keepReservation'),
        confirmText: t('confirmCancelBtn'),
        onConfirm: async () => {
          // Cancel local scheduled notification reminder if exists
          if (booking.notificationId) {
            notificationService.cancelScheduledReminder(booking.notificationId);
          }

          if (isOffline) {
            // Queue cancellation in outbox
            outboxService.queueCancellation(booking);
            showAlertDialog(t('cancelQueuedTitle'), t('cancelQueuedMsg'));
          } else {
            // Cancel immediately online
            try {
              const res = await bookingService.cancelBooking(
                bookingId,
                currentStudentId
              );
              if (res.success) {
                updateBooking(bookingId, { status: 'CANCELLED' });
                showAlertDialog(t('actionSuccess'), t('cancelSuccess'));
              } else {
                showAlertDialog(t('actionError'), res.error || t('errUnknown'));
              }
            } catch (e: any) {
              showAlertDialog(t('actionError'), e?.message || t('errUnknown'));
            }
          }
        },
      });
    },
    [myBookings, isOffline, currentStudentId, updateBooking, t]
  );

  const handleResolveConflict = useCallback(
    (booking: Booking) => {
      navigation.navigate('RoomDetail', { roomId: booking.roomId });
    },
    [navigation]
  );

  return (
    <SafeScreen edges={['top', 'left', 'right']} backgroundColor={colors.surface}>
      <View style={styles.container}>
        {/* Offline & Sync Status Banner */}
        <NetworkBanner />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            {t('myBookingsTitle')}
          </Text>
          <Text style={styles.subtitle}>
            {t('myBookingsSubtitle')}
          </Text>
        </View>

        {/* Filter Segment Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.tabsScrollContent}
          style={styles.tabsScrollView}
        >
          <TouchableOpacity
            style={[styles.tab, activeTab === 'ALL' && styles.tabActive]}
            onPress={() => setActiveTab('ALL')}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'ALL' }}
            accessibilityLabel={`${t('tabAll')}, ${tabCounts.ALL}`}
          >
            <Text style={[styles.tabText, activeTab === 'ALL' && styles.tabTextActive]}>
              {t('tabAll')} ({tabCounts.ALL})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'ACTIVE' && styles.tabActive]}
            onPress={() => setActiveTab('ACTIVE')}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'ACTIVE' }}
            accessibilityLabel={`${t('tabActive')}, ${tabCounts.ACTIVE}`}
          >
            <Text style={[styles.tabText, activeTab === 'ACTIVE' && styles.tabTextActive]}>
              ✓ {t('tabActive')} ({tabCounts.ACTIVE})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'PENDING' && styles.tabActive]}
            onPress={() => setActiveTab('PENDING')}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'PENDING' }}
            accessibilityLabel={`${t('tabPending')}, ${tabCounts.PENDING}`}
          >
            <Text style={[styles.tabText, activeTab === 'PENDING' && styles.tabTextActive]}>
              ⏳ {t('tabPending')} ({tabCounts.PENDING})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'CONFLICTED' && styles.tabActive]}
            onPress={() => setActiveTab('CONFLICTED')}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'CONFLICTED' }}
            accessibilityLabel={`${t('tabConflicted')}, ${tabCounts.CONFLICTED}`}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'CONFLICTED' && styles.tabTextActive,
                tabCounts.CONFLICTED > 0 && styles.tabTextConflict,
              ]}
            >
              ⚠️ {t('tabConflicted')} ({tabCounts.CONFLICTED})
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* List of Bookings */}
        <FlatList
          style={styles.flatList}
          key={isDesktop ? 'desktop-bookings-2' : 'mobile-bookings-1'}
          data={filteredBookings}
          keyExtractor={(item) => item.id}
          numColumns={isDesktop ? 2 : 1}
          columnWrapperStyle={isDesktop ? styles.columnWrapper : undefined}
          contentContainerStyle={[
            styles.listContent,
            isDesktop && styles.listContentDesktop,
            { paddingBottom: Math.max(insets.bottom, 16) + 84 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onCancel={handleCancelBooking}
              onResolveConflict={handleResolveConflict}
              onViewPass={(id) => {
                const b = myBookings.find((item) => item.id === id);
                if (b && b.status === 'CONFIRMED') {
                  setPassBooking(b);
                }
              }}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title={t('emptyBookingsTitle')}
              subtitle={t('emptyBookingsSubtitle')}
              onAction={() => navigation.navigate('MainTabs', { screen: 'Rooms' })}
              actionText={t('exploreRooms')}
            />
          }
        />

        {/* QR Booking Pass Modal */}
        <BookingPassModal
          booking={passBooking}
          visible={passBooking !== null}
          onClose={() => setPassBooking(null)}
        />
      </View>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    width: '100%',
    maxWidth: 1140,
    alignSelf: 'center',
  },
  columnWrapper: {
    gap: 16,
    justifyContent: 'space-between',
  },
  listContentDesktop: {
    paddingTop: spacing.base,
    paddingBottom: 40,
  },
  header: {
    flexShrink: 0,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.extrabold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: typography.weights.medium,
  },
  tabsScrollView: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    height: 52,
    maxHeight: 52,
    flexGrow: 0,
    flexShrink: 0,
  },
  tabsScrollContent: {
    paddingHorizontal: spacing.base,
    paddingVertical: 7,
    gap: spacing.xs,
    alignItems: 'center',
    flexDirection: 'row',
  },
  tab: {
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: layout.radii.sm,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 0,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    lineHeight: 18,
    textAlign: 'center',
  },
  tabTextActive: {
    color: colors.textInverse,
  },
  tabTextConflict: {
    color: colors.conflicted,
  },
  flatList: {
    flex: 1,
    width: '100%',
  },
  listContent: {
    padding: spacing.base,
    paddingBottom: 80,
  },
});
