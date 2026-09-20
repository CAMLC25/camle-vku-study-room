import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
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

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'MyBookings'>,
  NativeStackScreenProps<RootStackParamList>
>;

type FilterTab = 'ALL' | 'ACTIVE' | 'PENDING' | 'CONFLICTED' | 'CANCELLED';

export const MyBookingsScreen: React.FC<Props> = ({ navigation }) => {
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

      Alert.alert(
        'Cancel Reservation',
        `Are you sure you want to cancel your reservation for ${booking.roomName}?`,
        [
          { text: 'Keep Reservation', style: 'cancel' },
          {
            text: 'Yes, Cancel',
            style: 'destructive',
            onPress: async () => {
              // Cancel local scheduled notification reminder if exists
              if (booking.notificationId) {
                notificationService.cancelScheduledReminder(booking.notificationId);
              }

              if (isOffline) {
                // Queue cancellation in outbox
                outboxService.queueCancellation(booking);
                Alert.alert(
                  'Cancellation Queued',
                  'You are currently offline. Your cancellation request has been added to the outbox and will execute when you reconnect.',
                  [{ text: 'OK' }]
                );
              } else {
                // Cancel immediately online
                try {
                  const res = await bookingService.cancelBooking(
                    bookingId,
                    currentStudentId
                  );
                  if (res.success) {
                    updateBooking(bookingId, { status: 'CANCELLED' });
                    Alert.alert('Success', 'Your reservation has been cancelled.');
                  } else {
                    Alert.alert('Error', res.error || 'Failed to cancel reservation.');
                  }
                } catch (e: any) {
                  Alert.alert('Error', e?.message || 'Failed to cancel reservation.');
                }
              }
            },
          },
        ]
      );
    },
    [myBookings, isOffline, currentStudentId, updateBooking]
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
          <Text style={styles.title}>My Bookings</Text>
          <Text style={styles.subtitle}>
            Manage your study room reservations & sync queue
          </Text>
        </View>

        {/* Filter Segment Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'ALL' && styles.tabActive]}
            onPress={() => setActiveTab('ALL')}
          >
            <Text style={[styles.tabText, activeTab === 'ALL' && styles.tabTextActive]}>
              All ({tabCounts.ALL})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'ACTIVE' && styles.tabActive]}
            onPress={() => setActiveTab('ACTIVE')}
          >
            <Text style={[styles.tabText, activeTab === 'ACTIVE' && styles.tabTextActive]}>
              Active ({tabCounts.ACTIVE})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'PENDING' && styles.tabActive]}
            onPress={() => setActiveTab('PENDING')}
          >
            <Text style={[styles.tabText, activeTab === 'PENDING' && styles.tabTextActive]}>
              Pending ({tabCounts.PENDING})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'CONFLICTED' && styles.tabActive]}
            onPress={() => setActiveTab('CONFLICTED')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'CONFLICTED' && styles.tabTextActive,
                tabCounts.CONFLICTED > 0 && styles.tabTextConflict,
              ]}
            >
              Conflicts ({tabCounts.CONFLICTED})
            </Text>
          </TouchableOpacity>
        </View>

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
              title={
                activeTab === 'ALL'
                  ? 'No Bookings Yet'
                  : `No ${activeTab.toLowerCase()} bookings`
              }
              subtitle="Browse available campus study rooms to make a reservation."
              onAction={() => navigation.navigate('MainTabs', { screen: 'Rooms' })}
              actionText="Explore Rooms"
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 6,
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  tabActive: {
    backgroundColor: '#0284c7',
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
