import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { getBookingHorizonDays, DayOption } from '../utils/date';

interface DateSelectorProps {
  selectedDate: string; // ISO 'YYYY-MM-DD'
  onSelectDate: (date: string) => void;
}

export const DateSelector: React.FC<DateSelectorProps> = ({
  selectedDate,
  onSelectDate,
}) => {
  const horizonDays = useMemo(() => getBookingHorizonDays(), []);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Select Date</Text>
        <Text style={styles.horizonSubtitle}>7-day reservation window</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {horizonDays.map((day: DayOption) => {
          const isSelected = selectedDate === day.dateString;

          return (
            <TouchableOpacity
              key={day.dateString}
              style={[
                styles.dateCard,
                isSelected && styles.dateCardSelected,
                day.isToday && !isSelected && styles.dateCardToday,
              ]}
              onPress={() => onSelectDate(day.dateString)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Select ${day.label}`}
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                style={[
                  styles.dayOfWeekText,
                  isSelected && styles.textSelected,
                ]}
              >
                {day.isToday ? 'TODAY' : day.dayOfWeek.toUpperCase()}
              </Text>

              <Text
                style={[
                  styles.dayNumberText,
                  isSelected && styles.textSelected,
                ]}
              >
                {day.dayOfMonth}
              </Text>

              {day.isToday && (
                <View
                  style={[
                    styles.todayDot,
                    isSelected && styles.todayDotSelected,
                  ]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  horizonSubtitle: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  dateCard: {
    width: 60,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  dateCardToday: {
    borderColor: '#38bdf8',
    backgroundColor: '#f0f9ff',
  },
  dateCardSelected: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  dayOfWeekText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4,
  },
  dayNumberText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  textSelected: {
    color: '#ffffff',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#0284c7',
    marginTop: 4,
  },
  todayDotSelected: {
    backgroundColor: '#ffffff',
  },
});
