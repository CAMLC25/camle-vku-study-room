import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SlotAvailability, SlotIndex } from '../types/slot';
import { SlotCell } from './SlotCell';
import { useTranslation } from '../store/useLanguageStore';

interface SlotGridProps {
  slots: Record<SlotIndex, SlotAvailability>;
  onSelectSlot: (slotIndex: SlotIndex) => void;
  onRefresh?: () => void;
  onSimulateRemoteBooking?: (slotIndex: SlotIndex) => void;
  isSimulateAllowed?: boolean;
}

const SLOT_INDICES: SlotIndex[] = [0, 1, 2, 3];

export const SlotGrid: React.FC<SlotGridProps> = ({
  slots,
  onSelectSlot,
  onRefresh,
  onSimulateRemoteBooking,
  isSimulateAllowed = true,
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('dailySlotsTitle')}</Text>
        <Text style={styles.subtitle}>{t('dailySlotsSubtitle')}</Text>
      </View>

      <View style={styles.slotsList}>
        {SLOT_INDICES.map((idx) => {
          const slot = slots[idx] || { slotIndex: idx, state: 'AVAILABLE' };
          return (
            <SlotCell
              key={idx}
              slotIndex={idx}
              state={slot.state}
              holdExpiresAt={slot.holdExpiresAt}
              onPress={onSelectSlot}
              onHoldExpired={() => onRefresh?.()}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  slotsList: {
    marginBottom: 4,
  },
});
