import { useWindowDimensions } from 'react-native';

/**
 * useResponsiveLayout
 * Responsive hook following VKU Cross-Platform Mobile App Development curriculum (Week 5, Slide 26).
 * Computes columns, orientation, and card width based on screen dimensions.
 */
export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();

  const isLandscape = width > height;
  const isTablet = width >= 768;
  const columns = width >= 1024 ? 3 : width >= 640 ? 2 : 1;

  // Calculate card width taking padding and gaps into account
  const totalHorizontalPadding = 32;
  const gap = 16;
  const cardWidth = columns > 1
    ? (width - totalHorizontalPadding - (columns - 1) * gap) / columns
    : width - totalHorizontalPadding;

  return {
    width,
    height,
    isLandscape,
    isTablet,
    columns,
    cardWidth,
  };
}
