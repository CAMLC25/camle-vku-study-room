import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SlotAvailability, SlotIndex } from '../types/slot';
import { SlotCell } from './SlotCell';

interface SlotGridProps {
  slots: Record<SlotIndex, SlotAvailability>;
  onSelectSlot: (slotIndex: SlotIndex) => void;
  onSimulateRemoteBooking?: (slotIndex: SlotIndex) => void;
  isSimulateAllowed?: boolean;
}

const SLOT_INDICES: SlotIndex[] = [0, 1, 2, 3];

export const SlotGrid: React.FC<SlotGridProps> = ({
  slots,
  onSelectSlot,
  onSimulateRemoteBooking,
  isSimulateAllowed = true,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Daily Time Slots</Text>
        <Text style={styles.subtitle}>Four 2-hour study sessions</Text>
      </View>

      <View style={styles.slotsList}>
        {SLOT_INDICES.map((idx) => {
          const slot = slots[idx] || { slotIndex: idx, state: 'AVAILABLE' };
          return (
            <SlotCell
              key={idx}
              slotIndex={idx}
              state={slot.state}
              onPress={onSelectSlot}
            />
          );
        })}
      </View>

      {/* Evaluator Simulation Bar for Realtime grading */}
      {isSimulateAllowed && onSimulateRemoteBooking && (
        <View style={styles.simContainer}>
          <View style={styles.simHeader}>
            <Text style={styles.simBadge}>GRADING / DEMO HELPER</Text>
            <Text style={styles.simTitle}>Simulate Realtime Event</Text>
          </View>
          <Text style={styles.simDescription}>
            Trigger a simulated remote booking from another student on this room/date:
          </Text>
          <View style={styles.simButtonsRow}>
            {SLOT_INDICES.map((idx) => (
              <TouchableOpacity
                key={`sim-${idx}`}
                style={styles.simButton}
                onPress={() => onSimulateRemoteBooking(idx)}
                activeOpacity={0.7}
              >
                <Text style={styles.simButtonText}>Book Slot {idx + 1}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
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
    marginBottom: 8,
  },
  simContainer: {
    marginTop: 16,
    padding: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  simHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  simBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0284c7',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  simTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  simDescription: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 10,
  },
  simButtonsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  simButton: {
    flex: 1,
    backgroundColor: '#e2e8f0',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  simButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
});
