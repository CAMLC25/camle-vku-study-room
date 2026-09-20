import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useBookingStore } from '../store/useBookingStore';

export const NetworkBanner: React.FC = () => {
  const { isConnected, isSimulatedOffline, toggleSimulatedOffline, isSyncing, syncNow } =
    useNetworkStatus();

  const roomsLastUpdatedAt = useBookingStore(
    (state) => state.roomsLastUpdatedAt
  );
  const outbox = useBookingStore((state) => state.outbox);
  const pendingCount = outbox.filter((i) => i.status === 'PENDING_SYNC').length;

  const formatLastUpdatedTime = () => {
    if (!roomsLastUpdatedAt) return 'Recently';
    try {
      const d = new Date(roomsLastUpdatedAt);
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return `${hours}:${mins}`;
    } catch {
      return 'Recently';
    }
  };

  if (isConnected && !isSimulatedOffline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  const isOffline = !isConnected || isSimulatedOffline;

  return (
    <View
      style={[
        styles.banner,
        isOffline ? styles.bannerOffline : styles.bannerSyncing,
      ]}
    >
      <View style={styles.textContainer}>
        <Text style={styles.icon}>{isOffline ? '📡' : '🔄'}</Text>
        <View>
          <Text style={styles.bannerTitle}>
            {isOffline
              ? `Offline — showing cached data`
              : isSyncing
              ? 'Syncing changes with campus server...'
              : `${pendingCount} changes awaiting connection`}
          </Text>
          <Text style={styles.bannerSubtitle}>
            {isOffline
              ? `Last updated at ${formatLastUpdatedTime()}${
                  pendingCount > 0 ? ` • ${pendingCount} pending offline action(s)` : ''
                }`
              : `Connected to VKU server`}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={isOffline ? toggleSimulatedOffline : syncNow}
        activeOpacity={0.7}
      >
        <Text style={styles.actionButtonText}>
          {isOffline ? 'Go Online' : 'Sync Now'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  bannerOffline: {
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
  },
  bannerSyncing: {
    backgroundColor: '#eff6ff',
    borderColor: '#dbeafe',
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  icon: {
    fontSize: 16,
  },
  bannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400e',
  },
  bannerSubtitle: {
    fontSize: 11,
    color: '#b45309',
    marginTop: 1,
  },
  actionButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d97706',
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b45309',
  },
});
