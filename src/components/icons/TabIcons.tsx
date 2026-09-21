import React from 'react';
import Svg, { Path, Rect, Line, Circle } from 'react-native-svg';

interface TabIconProps {
  focused: boolean;
  color: string;
  size?: number;
}

export const RoomsTabIcon: React.FC<TabIconProps> = ({
  focused,
  color,
  size = 24,
}) => {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={focused ? 2.3 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M3 21h18" />
      <Path d="M5 21V7l8-4v18" />
      <Path d="M13 7l6 3v11" />
      <Path d="M9 9v.01" />
      <Path d="M9 12v.01" />
      <Path d="M9 15v.01" />
      <Path d="M9 18v.01" />
    </Svg>
  );
};

export const BookingsTabIcon: React.FC<TabIconProps> = ({
  focused,
  color,
  size = 24,
}) => {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={focused ? 2.3 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Rect x="3" y="4" width="18" height="18" rx="3" />
      <Line x1="16" y1="2" x2="16" y2="6" />
      <Line x1="8" y1="2" x2="8" y2="6" />
      <Line x1="3" y1="10" x2="21" y2="10" />
      <Path d="m9 16 2 2 4-4" />
    </Svg>
  );
};

export const ProfileTabIcon: React.FC<TabIconProps> = ({
  focused,
  color,
  size = 24,
}) => {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={focused ? 2.3 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <Circle cx="12" cy="7" r="4" />
    </Svg>
  );
};
