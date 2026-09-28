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
  useWindowDimensions,
} from 'react-native';
import { SafeScreen } from '../components/layout/SafeScreen';
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
import { getTodayDateString, getCurrentOrNextSlotIndex } from '../utils/date';
import { SlotIndex } from '../types/slot';
import { colors, layout, spacing, typography } from '../theme/theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Rooms'>,
  NativeStackScreenProps<RootStackParamList>
>;

export const RoomListScreen: React.FC<Props> = ({ navigation }) => {
  const { t, language } = useTranslation();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  // Narrow Zustand selectors (no whole-store subscriptions)
  const rooms = useBookingStore((state) => state.rooms);
  const isLoading = useBookingStore((state) => state.isRoomsLoading);
  const error = useBookingStore((state) => state.roomsError);
  const filters = useBookingStore((state) => state.filters);
  const availabilityCache = useBookingStore((state) => state.availabilityCache);
  const fetchRooms = useBookingStore((state) => state.fetchRooms);
  const setFilters = useBookingStore((state) => state.setFilters);
  const resetFilters = useBookingStore((state) => state.resetFilters);

  const [showFilters, setShowFilters] = useState<boolean>(false);
  const todayStr = useMemo(() => getTodayDateString(), []);
  const currentSlot = useMemo(() => getCurrentOrNextSlotIndex(), []);

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

  const isRoomAvailableNow = useCallback(
    (roomId: string): boolean => {
      const cacheKey = `${roomId}:${todayStr}`;
      const dayAvail = availabilityCache[cacheKey];
      if (dayAvail && dayAvail.slots) {
        const slotState = dayAvail.slots[currentSlot as SlotIndex]?.state;
        if (slotState && slotState !== 'AVAILABLE') {
          return false;
        }
      }
      return true;
    },
    [availabilityCache, todayStr, currentSlot]
  );

  // Optimized FlatList renderItem & keyExtractor with useCallback
  const renderItem = useCallback(
    ({ item }: { item: Room }) => (
      <RoomCard
        room={item}
        onPress={handleRoomPress}
        isAvailableNow={isRoomAvailableNow(item.id)}
      />
    ),
    [handleRoomPress, isRoomAvailableNow]
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
    <SafeScreen edges={['top', 'left', 'right']} backgroundColor={colors.surface}>
      <View style={styles.container}>
        {/* Offline & Sync Status Banner */}
        <NetworkBanner />

        <View style={styles.contentWrapper}>
          {/* Top Header */}
          <View style={[styles.header, isDesktop && styles.headerDesktop]}>
            <View style={styles.titleRow}>
              <View style={styles.titleTextCol}>
                <Text style={styles.appTitle} accessibilityRole="header">
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
              key={isDesktop ? 'desktop-grid-2' : 'mobile-list-1'}
              data={filteredRooms}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              numColumns={isDesktop ? 2 : 1}
              columnWrapperStyle={isDesktop ? styles.columnWrapper : undefined}
              getItemLayout={isDesktop ? undefined : getItemLayout}
              contentContainerStyle={[
                styles.listContent,
                isDesktop && styles.listContentDesktop,
              ]}
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
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
      </View>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: 1140,
    alignSelf: 'center',
  },
  columnWrapper: {
    gap: 16,
    justifyContent: 'space-between',
  },
  headerDesktop: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  listContentDesktop: {
    paddingTop: spacing.xs,
    paddingBottom: 40,
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  titleTextCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  appTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.extrabold,
    color: colors.textPrimary,
  },
  appSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: typography.weights.medium,
  },
  filterToggleButton: {
    minHeight: layout.minTouchTarget,
    minWidth: layout.minTouchTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: layout.radii.sm,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterToggleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterToggleText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  filterToggleTextActive: {
    color: colors.textInverse,
  },
  searchWrapper: {
    marginTop: spacing.xxs,
  },
  listContent: {
    padding: spacing.base,
    paddingBottom: 80,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.base,
    color: colors.textMuted,
  },
  errorTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  errorSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.conflicted,
    textAlign: 'center',
    marginBottom: spacing.base,
    maxWidth: 280,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: layout.radii.sm,
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButtonText: {
    color: colors.textInverse,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
});
