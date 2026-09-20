import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Building, Equipment, RoomFilterState } from '../types/room';
import { useTranslation } from '../store/useLanguageStore';

interface FilterChipsProps {
  filters: RoomFilterState;
  onUpdateFilters: (updates: Partial<RoomFilterState>) => void;
  onResetFilters: () => void;
}

const BUILDINGS: (Building | 'ALL')[] = ['ALL', 'A', 'B', 'C', 'V'];

const EQUIPMENT_OPTIONS: Equipment[] = [
  'Projector',
  'Whiteboard',
  'High-spec PC',
  'AC',
];

export const FilterChips: React.FC<FilterChipsProps> = ({
  filters,
  onUpdateFilters,
  onResetFilters,
}) => {
  const { t } = useTranslation();

  const capacityOptions = [
    { label: t('capacityAll'), min: 2, max: 20 },
    { label: t('capacitySmall'), min: 2, max: 4 },
    { label: t('capacityMedium'), min: 5, max: 10 },
    { label: t('capacityLarge'), min: 11, max: 20 },
  ];

  const equipmentLabels: Record<Equipment, string> = {
    'Projector': t('equipmentProjector'),
    'Whiteboard': t('equipmentWhiteboard'),
    'High-spec PC': t('equipmentHighSpecPC'),
    'AC': t('equipmentAC'),
  };

  const toggleEquipment = (eq: Equipment) => {
    const isSelected = filters.selectedEquipment.includes(eq);
    const updated = isSelected
      ? filters.selectedEquipment.filter((e) => e !== eq)
      : [...filters.selectedEquipment, eq];
    onUpdateFilters({ selectedEquipment: updated });
  };

  const isFilterActive =
    filters.building !== 'ALL' ||
    filters.capacityMin !== 2 ||
    filters.capacityMax !== 20 ||
    filters.selectedEquipment.length > 0 ||
    filters.searchQuery.length > 0;

  return (
    <View style={styles.container}>
      {/* 1. Building Row */}
      <View style={styles.filterSection}>
        <Text style={styles.sectionLabel}>{t('buildingLabel')}:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {BUILDINGS.map((b) => {
            const isSelected = filters.building === b;
            return (
              <TouchableOpacity
                key={b}
                style={[styles.chip, isSelected && styles.chipActive]}
                onPress={() => onUpdateFilters({ building: b })}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected && styles.chipTextActive,
                  ]}
                >
                  {b === 'ALL' ? t('allBuildings') : `${t('buildingLabel')} ${b}`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 2. Capacity Row */}
      <View style={styles.filterSection}>
        <Text style={styles.sectionLabel}>{t('seats')}:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {capacityOptions.map((cap) => {
            const isSelected =
              filters.capacityMin === cap.min && filters.capacityMax === cap.max;
            return (
              <TouchableOpacity
                key={cap.label}
                style={[styles.chip, isSelected && styles.chipActive]}
                onPress={() =>
                  onUpdateFilters({
                    capacityMin: cap.min,
                    capacityMax: cap.max,
                  })
                }
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected && styles.chipTextActive,
                  ]}
                >
                  {cap.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 3. Equipment Row */}
      <View style={styles.filterSection}>
        <View style={styles.equipmentLabelRow}>
          <Text style={styles.sectionLabel}>{t('equipmentTitle')}:</Text>
          {isFilterActive && (
            <TouchableOpacity onPress={onResetFilters} style={styles.resetButton}>
              <Text style={styles.resetButtonText}>{t('clearFilters')}</Text>
            </TouchableOpacity>
          )}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {EQUIPMENT_OPTIONS.map((eq) => {
            const isSelected = filters.selectedEquipment.includes(eq);
            return (
              <TouchableOpacity
                key={eq}
                style={[styles.chip, isSelected && styles.chipActive]}
                onPress={() => toggleEquipment(eq)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected && styles.chipTextActive,
                  ]}
                >
                  {isSelected ? `✓ ${equipmentLabels[eq]}` : `+ ${equipmentLabels[eq]}`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 8,
  },
  filterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    width: 72,
  },
  equipmentLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 72,
  },
  chipsScroll: {
    gap: 6,
    paddingRight: 16,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  chipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  resetButton: {
    paddingHorizontal: 6,
  },
  resetButtonText: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '600',
  },
});
