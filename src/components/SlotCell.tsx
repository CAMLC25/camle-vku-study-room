import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {
  SlotIndex,
  SlotState,
  TIME_SLOT_DEFINITIONS,
} from '../types/slot';

interface SlotCellProps {
  slotIndex: SlotIndex;
  state: SlotState;
  onPress: (slotIndex: SlotIndex) => void;
  disabled?: boolean;
}

export const SlotCell: React.FC<SlotCellProps> = ({
  slotIndex,
  state,
  onPress,
  disabled = false,
}) => {
  const definition = TIME_SLOT_DEFINITIONS[slotIndex];

  const isInteractive = state === 'AVAILABLE' || state === 'MINE';

  const getStatusConfig = () => {
    switch (state) {
      case 'AVAILABLE':
        return {
          badgeText: 'Available',
          badgeBg: '#ecfdf5',
          badgeColor: '#059669',
          cardBorder: '#a7f3d0',
          cardBg: '#ffffff',
        };
      case 'MINE':
        return {
          badgeText: 'Your Booking',
          badgeBg: '#e0f2fe',
          badgeColor: '#0284c7',
          cardBorder: '#38bdf8',
          cardBg: '#f0f9ff',
        };
      case 'HELD_BY_OTHER':
        return {
          badgeText: 'Temporarily Held',
          badgeBg: '#fef3c7',
          badgeColor: '#d97706',
          cardBorder: '#fde68a',
          cardBg: '#fffbeb',
        };
      case 'PENDING_SYNC':
        return {
          badgeText: 'Awaiting Sync',
          badgeBg: '#f3e8ff',
          badgeColor: '#7e22ce',
          cardBorder: '#d8b4fe',
          cardBg: '#faf5ff',
        };
      case 'BOOKED':
      default:
        return {
          badgeText: 'Booked',
          badgeBg: '#f1f5f9',
          badgeColor: '#64748b',
          cardBorder: '#e2e8f0',
          cardBg: '#f8fafc',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          borderColor: config.cardBorder,
          backgroundColor: config.cardBg,
        },
      ]}
      onPress={() => isInteractive && !disabled && onPress(slotIndex)}
      activeOpacity={isInteractive ? 0.75 : 1}
      disabled={!isInteractive || disabled}
      accessibilityRole="button"
      accessibilityLabel={`Slot ${definition.label}, ${config.badgeText}`}
    >
      <View style={styles.leftSection}>
        <View style={styles.slotBadge}>
          <Text style={styles.slotIndexText}>SLOT {slotIndex + 1}</Text>
        </View>
        <Text style={styles.timeLabel}>{definition.label}</Text>
      </View>

      <View style={styles.rightSection}>
        <View
          style={[
            styles.stateBadge,
            { backgroundColor: config.badgeBg },
          ]}
        >
          <Text style={[styles.stateBadgeText, { color: config.badgeColor }]}>
            {config.badgeText}
          </Text>
        </View>
        {state === 'AVAILABLE' && (
          <Text style={styles.actionPrompt}>Tap to Book →</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  slotBadge: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  slotIndexText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
  timeLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: 4,
  },
  stateBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stateBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionPrompt: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '600',
  },
});
