import React from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
import { colors, layout, spacing, typography } from '../theme/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search study room or lab...',
}) => {
  return (
    <View style={styles.container} accessibilityRole="search">
      <View style={styles.searchIconContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
      </View>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textLight}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
        accessibilityLabel={placeholder}
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={() => onChangeText('')}
          style={styles.clearButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Clear search text"
        >
          <Text style={styles.clearButtonText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: layout.radii.md,
    paddingHorizontal: spacing.md,
    height: layout.buttonHeightSm + 6, // 44dp
    minHeight: layout.minTouchTarget,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIconContainer: {
    marginRight: spacing.sm,
  },
  searchIcon: {
    fontSize: 14,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: typography.sizes.base,
    color: colors.textPrimary,
    padding: 0,
  },
  clearButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.borderStrong,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
  clearButtonText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: typography.weights.bold,
  },
});

