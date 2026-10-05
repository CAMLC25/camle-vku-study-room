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
  const columns = width >= 768 ? 2 : 1;

  // Cap effective width to the contentWrapper maxWidth (1140)
  const maxContainerWidth = 1140;
  const effectiveWidth = Math.min(width, maxContainerWidth);
  const totalHorizontalPadding = 32;
  const gap = 16;
  const cardWidth = columns > 1
    ? (effectiveWidth - totalHorizontalPadding - (columns - 1) * gap) / columns
    : effectiveWidth - totalHorizontalPadding;

  return {
    width,
    height,
    isLandscape,
    isTablet,
    columns,
    cardWidth,
  };
}
