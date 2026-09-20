import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'MyBookings'>,
  NativeStackScreenProps<RootStackParamList>
>;

type FilterTab = 'ALL' | 'ACTIVE' | 'PENDING' | 'CONFLICTED' | 'CANCELLED';

export const MyBookingsScreen: React.FC<Props> = ({ navigation }) => {
  const { t, language } = useTranslation();
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [passBooking, setPassBooking] = useState<Booking | null>(null);

  const myBookings = useBookingStore((state) => state.myBookings);
  const currentStudentId = useBookingStore((state) => state.currentStudentId);
  const updateBooking = useBookingStore((state) => state.updateBooking);
  const { isConnected, isSimulatedOffline } = useNetworkStatus();

  const isOffline = !isConnected || isSimulatedOffline;

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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Offline & Sync Status Banner */}
        <NetworkBanner />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('myBookingsTitle')}</Text>
          <Text style={styles.subtitle}>
            {t('myBookingsSubtitle')}
          </Text>
        </View>

        {/* Filter Segment Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScrollContent}
          style={styles.tabsScrollView}
        >
          <TouchableOpacity
            style={[styles.tab, activeTab === 'ALL' && styles.tabActive]}
            onPress={() => setActiveTab('ALL')}
            accessibilityRole="tab"
            accessibilityLabel={`${t('tabAll')}, ${tabCounts.ALL}`}
          >
            <Text style={[styles.tabText, activeTab === 'ALL' && styles.tabTextActive]}>
              {t('tabAll')} ({tabCounts.ALL})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'ACTIVE' && styles.tabActive]}
            onPress={() => setActiveTab('ACTIVE')}
            accessibilityRole="tab"
            accessibilityLabel={`${t('tabActive')}, ${tabCounts.ACTIVE}`}
          >
            <Text style={[styles.tabText, activeTab === 'ACTIVE' && styles.tabTextActive]}>
              ✓ {t('tabActive')} ({tabCounts.ACTIVE})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'PENDING' && styles.tabActive]}
            onPress={() => setActiveTab('PENDING')}
            accessibilityRole="tab"
            accessibilityLabel={`${t('tabPending')}, ${tabCounts.PENDING}`}
          >
            <Text style={[styles.tabText, activeTab === 'PENDING' && styles.tabTextActive]}>
              ⏳ {t('tabPending')} ({tabCounts.PENDING})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'CONFLICTED' && styles.tabActive]}
            onPress={() => setActiveTab('CONFLICTED')}
            accessibilityRole="tab"
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
          data={filteredBookings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  tabsScrollView: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    maxHeight: 52,
  },
  tabsScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    alignItems: 'center',
  },
  tab: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tabActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  tabTextConflict: {
    color: '#ef4444',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
});
