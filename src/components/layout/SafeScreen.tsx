import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets, Edge } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../../theme/colors';

export interface SafeScreenProps {
  children: React.ReactNode;
  edges?: Edge[];
  backgroundColor?: string;
  statusBarStyle?: 'light' | 'dark' | 'auto';
  style?: StyleProp<ViewStyle>;
}

/**
 * SafeScreen Component
 * Centralizes screen-level Safe Area insets and status bar contrast
 * Avoids double-padding in nested navigators and modals
 */
export const SafeScreen: React.FC<SafeScreenProps> = ({
  children,
  edges = ['top', 'left', 'right'],
  backgroundColor = colors.background,
  statusBarStyle = 'dark',
  style,
}) => {
  const insets = useSafeAreaInsets();

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor,
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  };

  return (
    <View style={[styles.container, containerStyle, style]}>
      <StatusBar style={statusBarStyle} />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
