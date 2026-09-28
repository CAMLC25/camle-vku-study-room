import { TextStyle } from 'react-native';

/**
 * VKU Study Room - Design System Typography
 * Clean, readable, mobile-first font hierarchy
 */
export const typography = {
  // Font Sizes
  sizes: {
    xs: 11,
    sm: 12,
    base: 14,
    md: 15,
    lg: 16,
    xl: 18,
    xxl: 20,
    title: 24,
    hero: 28,
  },

  // Font Weights
  weights: {
    regular: '400' as TextStyle['fontWeight'],
    medium: '500' as TextStyle['fontWeight'],
    semibold: '600' as TextStyle['fontWeight'],
    bold: '700' as TextStyle['fontWeight'],
    extrabold: '800' as TextStyle['fontWeight'],
  },

  // Line Heights
  lineHeights: {
    tight: 16,
    normal: 20,
    relaxed: 24,
    loose: 28,
    heading: 32,
  },
};
