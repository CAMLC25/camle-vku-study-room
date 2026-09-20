import React, { useEffect, useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, MainTabParamList } from '../navigation/types';
import { useBookingStore } from '../store/useBookingStore';
import { Room } from '../types/room';
import { RoomCard, ROOM_CARD_HEIGHT } from '../components/RoomCard';
import { SearchBar } from '../components/SearchBar';
import { FilterChips } from '../components/FilterChips';
import { EmptyState } from '../components/EmptyState';
import { NetworkBanner } from '../components/NetworkBanner';
import { useTranslation } from '../store/useLanguageStore';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Rooms'>,
  NativeStackScreenProps<RootStackParamList>
>;

export const RoomListScreen: React.FC<Props> = ({ navigation }) => {
  const { t, language } = useTranslation();
  // Narrow Zustand selectors (no whole-store subscriptions)
  const rooms = useBookingStore((state) => state.rooms);
  const isLoading = useBookingStore((state) => state.isRoomsLoading);
  const error = useBookingStore((state) => state.roomsError);
  const filters = useBookingStore((state) => state.filters);
  const fetchRooms = useBookingStore((state) => state.fetchRooms);
  const setFilters = useBookingStore((state) => state.setFilters);
  const resetFilters = useBookingStore((state) => state.resetFilters);

  const [showFilters, setShowFilters] = useState<boolean>(false);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleRoomPress = useCallback(
    (roomId: string) => {
      navigation.navigate('RoomDetail', { roomId });
    },
    [navigation]
  );

  const handleSearchChange = useCallback(
    (text: string) => {
      setFilters({ searchQuery: text });
    },
    [setFilters]
  );

  // Filter computation with useMemo for high-performance updates
  const filteredRooms = useMemo(() => {
    const query = filters.searchQuery.trim().toLowerCase();

    return rooms.filter((room) => {
      // 1. Text Search Filter (name, building, floor, equipment)
      if (query.length > 0) {
        const matchesName = room.name.toLowerCase().includes(query);
        const matchesBuilding = `building ${room.building}`.toLowerCase().includes(query);
        const matchesEquipment = room.equipment.some((eq) =>
          eq.toLowerCase().includes(query)
        );
        if (!matchesName && !matchesBuilding && !matchesEquipment) {
          return false;
        }
      }

      // 2. Building Filter
      if (filters.building !== 'ALL' && room.building !== filters.building) {
        return false;
      }

      // 3. Capacity Range Filter
      if (room.capacity < filters.capacityMin || room.capacity > filters.capacityMax) {
        return false;
      }

      // 4. Equipment Filter (Room must have ALL selected equipment)
      if (filters.selectedEquipment.length > 0) {
        const hasAllEquipment = filters.selectedEquipment.every((eq) =>
          room.equipment.includes(eq)
        );
        if (!hasAllEquipment) {
          return false;
        }
      }

      return true;
    });
  }, [rooms, filters]);

  // Optimized FlatList renderItem & keyExtractor with useCallback
  const renderItem = useCallback(
    ({ item }: { item: Room }) => (
      <RoomCard
        room={item}
        onPress={handleRoomPress}
        isAvailableNow={true}
      />
    ),
    [handleRoomPress]
  );

  const keyExtractor = useCallback((item: Room) => item.id, []);

  const getItemLayout = useCallback(
    (_data: ArrayLike<Room> | null | undefined, index: number) => ({
      length: 138,
      offset: 138 * index,
      index,
    }),
    []
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.building !== 'ALL') count++;
    if (filters.capacityMin !== 2 || filters.capacityMax !== 20) count++;
    count += filters.selectedEquipment.length;
    return count;
  }, [filters]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Offline & Sync Status Banner */}
        <NetworkBanner />

        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.appTitle}>
                {language === 'vi' ? 'Không gian học tập VKU' : 'VKU Study Spaces'}
              </Text>
              <Text style={styles.appSubtitle}>
                {language === 'vi'
                  ? `Hiển thị ${filteredRooms.length} / ${rooms.length} phòng học`
                  : `${filteredRooms.length} of ${rooms.length} rooms match`}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.filterToggleButton,
                (showFilters || activeFilterCount > 0) && styles.filterToggleActive,
              ]}
              onPress={() => setShowFilters((prev) => !prev)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterToggleText,
                  (showFilters || activeFilterCount > 0) && styles.filterToggleTextActive,
                ]}
              >
                {t('filterTitle')} {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View style={styles.searchWrapper}>
            <SearchBar
              value={filters.searchQuery}
              onChangeText={handleSearchChange}
              placeholder={t('searchPlaceholder')}
            />
          </View>
        </View>

        {/* Collapsible Filter Panel */}
        {showFilters && (
          <FilterChips
            filters={filters}
            onUpdateFilters={setFilters}
            onResetFilters={resetFilters}
          />
        )}

        {/* Content Area */}
        {isLoading && rooms.length === 0 ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#0284c7" />
            <Text style={styles.loadingText}>{t('loading')}</Text>
          </View>
        ) : error && rooms.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorTitle}>
              {language === 'vi' ? 'Không thể tải danh sách phòng' : 'Unable to Load Rooms'}
            </Text>
            <Text style={styles.errorSubtitle}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchRooms}>
              <Text style={styles.retryButtonText}>{t('refresh')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredRooms}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            getItemLayout={getItemLayout}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            // 60 FPS FlatList Performance Parameters
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={5}
            removeClippedSubviews={Platform.OS === 'android'}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={fetchRooms}
                tintColor="#0284c7"
                colors={['#0284c7']}
              />
            }
            ListEmptyComponent={
              <EmptyState
                title={t('emptyRoomsTitle')}
                subtitle={t('emptyRoomsSubtitle')}
                onAction={resetFilters}
                actionText={t('clearFilters')}
              />
            }
          />
        )}
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
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  appSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  filterToggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterToggleActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  filterToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterToggleTextActive: {
    color: '#ffffff',
  },
  searchWrapper: {
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  errorSubtitle: {
    fontSize: 13,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
    maxWidth: 260,
  },
  retryButton: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});
