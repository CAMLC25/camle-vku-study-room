import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { layout } from '../../theme/theme';

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backAccessibilityLabel?: string;
  rightAction?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  textColor?: string;
}

/**
 * AppHeader Component
 * Clean, accessible mobile header with 44x44 touch targets and clear hierarchy
 */
export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  onBack,
  backAccessibilityLabel = 'Go back',
  rightAction,
  style,
  backgroundColor = colors.surface,
  textColor = colors.textPrimary,
}) => {
  return (
    <View style={[styles.headerContainer, { backgroundColor }, style]}>
      {/* Back Button or Empty Slot for balance */}
      {onBack ? (
        <TouchableOpacity
          onPress={onBack}
          style={styles.actionSlot}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={backAccessibilityLabel}
          accessibilityHint="Navigates to the previous screen"
        >
          <View style={styles.backCircle}>
            <Text style={[styles.backArrow, { color: textColor }]}>‹</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <View style={styles.emptySlot} />
      )}

      {/* Title & Subtitle Area */}
      <View style={styles.titleArea}>
        <Text
          numberOfLines={1}
          style={[styles.titleText, { color: textColor }]}
          accessibilityRole="header"
        >
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={styles.subtitleText}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* Right Action Slot */}
      {rightAction ? (
        <View style={styles.actionSlot}>{rightAction}</View>
      ) : (
        <View style={styles.emptySlot} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    height: layout.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  actionSlot: {
    minWidth: layout.minTouchTarget,
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySlot: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
  },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: layout.radii.full,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 26,
    fontWeight: '300',
    lineHeight: 28,
    textAlign: 'center',
    marginTop: -2,
  },
  titleArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  titleText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    fontWeight: typography.weights.medium,
    marginTop: 1,
    textAlign: 'center',
  },
});
