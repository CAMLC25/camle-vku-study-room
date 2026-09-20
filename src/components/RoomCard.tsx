import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Room } from '../types/room';
import { useTranslation } from '../store/useLanguageStore';

export const ROOM_CARD_HEIGHT = 136;

interface RoomCardProps {
  room: Room;
  onPress: (roomId: string) => void;
  isAvailableNow?: boolean;
}

export const RoomCard = React.memo<RoomCardProps>(
  ({ room, onPress, isAvailableNow = true }) => {
    const { t } = useTranslation();

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.75}
        onPress={() => onPress(room.id)}
        accessibilityRole="button"
        accessibilityLabel={`${room.name}, ${t('buildingLabel')} ${room.building}, ${t('floor')} ${room.floor}, ${room.capacity} ${t('seats')}`}
      >
        <Image
          source={{ uri: room.photoUrl }}
          style={styles.image}
          contentFit="cover"
          transition={200}
          cachePolicy="disk"
        />

        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text style={styles.roomName} numberOfLines={1}>
              {room.name}
            </Text>
            <View
              style={[
                styles.statusBadge,
                isAvailableNow ? styles.statusAvailable : styles.statusOccupied,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  isAvailableNow ? styles.statusDotAvailable : styles.statusDotOccupied,
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  isAvailableNow ? styles.statusTextAvailable : styles.statusTextOccupied,
                ]}
              >
                {isAvailableNow ? t('slotAvailable') : t('occupied')}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <Text style={styles.metaPillText}>
                {t('buildingLabel')} {room.building} • {t('floor')} {room.floor}
              </Text>
            </View>
            <View style={styles.capacityPill}>
              <Text style={styles.capacityPillText}>
                {room.capacity} {t('seats')}
              </Text>
            </View>
          </View>

          <View style={styles.equipmentRow}>
            {room.equipment.slice(0, 3).map((eq) => (
              <View key={eq} style={styles.eqTag}>
                <Text style={styles.eqTagText} numberOfLines={1}>
                  {eq}
                </Text>
              </View>
            ))}
            {room.equipment.length > 3 && (
              <View style={styles.eqTagMore}>
                <Text style={styles.eqTagMoreText}>
                  +{room.equipment.length - 3}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.room.id === nextProps.room.id &&
      prevProps.room.name === nextProps.room.name &&
      prevProps.room.capacity === nextProps.room.capacity &&
      prevProps.room.equipment.length === nextProps.room.equipment.length &&
      prevProps.isAvailableNow === nextProps.isAvailableNow
    );
  }
);

RoomCard.displayName = 'RoomCard';

const styles = StyleSheet.create({
  card: {
    height: 124,
    marginBottom: 12,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  image: {
    width: 110,
    height: '100%',
    backgroundColor: '#f1f5f9',
  },
  content: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  roomName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  statusAvailable: {
    backgroundColor: '#ecfdf5',
  },
  statusOccupied: {
    backgroundColor: '#fef2f2',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotAvailable: {
    backgroundColor: '#10b981',
  },
  statusDotOccupied: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusTextAvailable: {
    color: '#059669',
  },
  statusTextOccupied: {
    color: '#dc2626',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 2,
  },
  metaPill: {
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  metaPillText: {
    color: '#0284c7',
    fontSize: 11,
    fontWeight: '600',
  },
  capacityPill: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  capacityPillText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '500',
  },
  equipmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eqTag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    maxWidth: 90,
  },
  eqTagText: {
    fontSize: 10,
    color: '#475569',
  },
  eqTagMore: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  eqTagMoreText: {
    fontSize: 10,
    color: '#334155',
    fontWeight: '600',
  },
});
