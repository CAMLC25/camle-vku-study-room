import { Platform, ViewStyle } from 'react-native';
import { colors } from './colors';
import { spacing } from './spacing';
import { typography } from './typography';

/**
 * Common Layout Metrics & Touch Target Constants
 */
export const layout = {
  // Mobile Touch Target Guideline: 44x44 dp minimum
  minTouchTarget: 44,

  // Heights
  buttonHeight: 48,
  buttonHeightSm: 38,
  inputHeight: 50,
  headerHeight: 56,
  tabBarHeight: 56,

  // Border Radii
  radii: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    full: 9999,
  },
};

/**
 * Cross-platform Shadow and Elevation Styles
 */
export const shadows = {
  subtle: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
    },
    android: {
      elevation: 1,
    },
    web: {
      boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
    },
    default: {},
  }),

  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 8,
    },
    android: {
      elevation: 2,
    },
    web: {
      boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.08)',
    },
    default: {},
  }),

  modal: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 20,
    },
    android: {
      elevation: 10,
    },
    web: {
      boxShadow: '0 16px 36px -4px rgba(15, 23, 42, 0.22)',
    },
    default: {},
  }),
};

export const theme = {
  colors,
  spacing,
  typography,
  layout,
  shadows,
};

export { colors, spacing, typography };
