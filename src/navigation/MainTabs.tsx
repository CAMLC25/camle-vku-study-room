import React, { useMemo } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from './types';
import { RoomListScreen } from '../screens/RoomListScreen';
import { MyBookingsScreen } from '../screens/MyBookingsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { useTranslation } from '../store/useLanguageStore';
import { useBookingStore } from '../store/useBookingStore';
import {
  RoomsTabIcon,
  BookingsTabIcon,
  ProfileTabIcon,
} from '../components/icons/TabIcons';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabs: React.FC = () => {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();

  // Active bookings count for notification badge
  const myBookings = useBookingStore((state) => state.myBookings);
  const activeBookingsCount = useMemo(() => {
    return myBookings.filter(
      (b) => b.status === 'CONFIRMED' || b.status === 'PENDING_SYNC'
    ).length;
  }, [myBookings]);

  const isDesktopWeb = Platform.OS === 'web' && width > 768;

  const tabBarStyle = useMemo(() => {
    if (isDesktopWeb) {
      return {
        position: 'absolute' as const,
        bottom: 16,
        left: Math.max((width - 500) / 2, 16),
        width: Math.min(width - 32, 500),
        backgroundColor: '#ffffff',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        height: 70,
        paddingBottom: 8,
        paddingTop: 8,
        elevation: 8,
        ...Platform.select({
          web: {
            boxShadow:
              '0 12px 28px -4px rgba(0, 0, 0, 0.12), 0 6px 12px -2px rgba(0, 0, 0, 0.08)',
          },
        }),
      };
    }

    return {
      backgroundColor: '#ffffff',
      borderTopColor: '#e2e8f0',
      borderTopWidth: 1,
      height: Platform.OS === 'ios' ? 88 : 74,
      paddingBottom: Platform.OS === 'ios' ? 24 : 12,
      paddingTop: 8,
      elevation: 8,
    };
  }, [isDesktopWeb, width]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0284c7',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle,
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 2,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
          paddingBottom: 2,
        },
        tabBarBadgeStyle: {
          backgroundColor: '#0284c7',
          color: '#ffffff',
          fontSize: 10,
          fontWeight: '700',
          minWidth: 18,
          height: 18,
          borderRadius: 9,
          lineHeight: 18,
          textAlign: 'center',
          alignSelf: 'center',
          top: -3,
        },
      }}
    >
      <Tab.Screen
        name="Rooms"
        component={RoomListScreen}
        options={{
          tabBarLabel: t('navRooms'),
          tabBarIcon: ({ focused, color, size }) => (
            <RoomsTabIcon focused={focused} color={color} size={size ?? 22} />
          ),
        }}
      />
      <Tab.Screen
        name="MyBookings"
        component={MyBookingsScreen}
        options={{
          tabBarLabel: t('navMyBookings'),
          tabBarBadge: activeBookingsCount > 0 ? activeBookingsCount : undefined,
          tabBarIcon: ({ focused, color, size }) => (
            <BookingsTabIcon focused={focused} color={color} size={size ?? 22} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: t('navProfile'),
          tabBarIcon: ({ focused, color, size }) => (
            <ProfileTabIcon focused={focused} color={color} size={size ?? 22} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
