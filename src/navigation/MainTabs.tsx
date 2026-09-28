import React, { useMemo } from 'react';
import { Platform, useWindowDimensions, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
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
import { colors, layout } from '../theme/theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

interface DesktopTopBarProps extends BottomTabBarProps {
  activeBookingsCount: number;
}

const DesktopTopBar: React.FC<DesktopTopBarProps> = ({
  state,
  navigation,
  activeBookingsCount,
}) => {
  const { t, language, setLanguage } = useTranslation();
  const currentStudentName = useBookingStore((state) => state.currentStudentName);
  const currentStudentCode = useBookingStore((state) => state.currentStudentCode);

  return (
    <View style={desktopStyles.headerWrapper}>
      <View style={desktopStyles.headerInner}>
        {/* Brand */}
        <TouchableOpacity
          style={desktopStyles.brandCol}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Rooms')}
        >
          <View style={desktopStyles.brandIconBox}>
            <Text style={desktopStyles.brandIconText}>🏫</Text>
          </View>
          <View>
            <Text style={desktopStyles.brandTitle}>VKU SMART STUDY</Text>
            <Text style={desktopStyles.brandSubtitle}>
              {language === 'vi' ? 'ĐH CNTT & Truyền thông Việt - Hàn' : 'Vietnam - Korea University'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Navigation Links */}
        <View style={desktopStyles.navTabs}>
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            let label = t('navRooms');
            let icon = '🏢';
            if (route.name === 'MyBookings') {
              label = t('navMyBookings');
              icon = '📅';
            } else if (route.name === 'Profile') {
              label = t('navProfile');
              icon = '👤';
            }

            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                style={[
                  desktopStyles.tabItem,
                  isFocused && desktopStyles.tabItemActive,
                ]}
                activeOpacity={0.7}
              >
                <Text style={desktopStyles.tabIcon}>{icon}</Text>
                <Text
                  style={[
                    desktopStyles.tabLabel,
                    isFocused && desktopStyles.tabLabelActive,
                  ]}
                >
                  {label}
                </Text>
                {route.name === 'MyBookings' && activeBookingsCount > 0 && (
                  <View style={desktopStyles.badgePill}>
                    <Text style={desktopStyles.badgeText}>{activeBookingsCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Right Info: Student & Language */}
        <View style={desktopStyles.rightSection}>
          <TouchableOpacity
            style={desktopStyles.studentPill}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Profile')}
          >
            <View style={desktopStyles.avatarCircle}>
              <Text style={desktopStyles.avatarChar}>
                {currentStudentName ? currentStudentName.charAt(0) : 'U'}
              </Text>
            </View>
            <View style={desktopStyles.studentInfoCol}>
              <Text style={desktopStyles.studentName} numberOfLines={1}>
                {currentStudentName}
              </Text>
              <Text style={desktopStyles.studentCode}>MSSV: {currentStudentCode}</Text>
            </View>
          </TouchableOpacity>

          {/* Language toggle */}
          <View style={desktopStyles.langToggleBox}>
            <TouchableOpacity
              style={[desktopStyles.langBtn, language === 'vi' && desktopStyles.langBtnActive]}
              onPress={() => setLanguage('vi')}
              activeOpacity={0.7}
            >
              <Text style={[desktopStyles.langText, language === 'vi' && desktopStyles.langTextActive]}>
                VN
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[desktopStyles.langBtn, language === 'en' && desktopStyles.langBtnActive]}
              onPress={() => setLanguage('en')}
              activeOpacity={0.7}
            >
              <Text style={[desktopStyles.langText, language === 'en' && desktopStyles.langTextActive]}>
                EN
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

interface MobileBottomBarProps extends BottomTabBarProps {
  activeBookingsCount: number;
}

const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  state,
  navigation,
  insets,
  activeBookingsCount,
}) => {
  const { t } = useTranslation();

  return (
    <View
      style={[
        mobileStyles.barContainer,
        { paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 10) },
      ]}
    >
      <View style={mobileStyles.barInner}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          let label = t('navRooms');
          let IconComponent = RoomsTabIcon;
          if (route.name === 'MyBookings') {
            label = t('navMyBookings');
            IconComponent = BookingsTabIcon;
          } else if (route.name === 'Profile') {
            label = t('navProfile');
            IconComponent = ProfileTabIcon;
          }

          const color = isFocused ? '#0284c7' : '#64748b';

          return (
            <TouchableOpacity
              key={route.key}
              style={mobileStyles.tabItem}
              onPress={onPress}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
            >
              <View style={mobileStyles.iconWrapper}>
                <IconComponent focused={isFocused} color={color} size={22} />
                {route.name === 'MyBookings' && activeBookingsCount > 0 && (
                  <View style={mobileStyles.badge}>
                    <Text style={mobileStyles.badgeText}>
                      {activeBookingsCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  mobileStyles.tabLabel,
                  { color },
                  isFocused && mobileStyles.tabLabelActive,
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

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

  const isDesktopWeb = Platform.OS === 'web' && width >= 768;

  return (
    <Tab.Navigator
      tabBar={(props) =>
        isDesktopWeb ? (
          <DesktopTopBar {...props} activeBookingsCount={activeBookingsCount} />
        ) : (
          <MobileBottomBar {...props} activeBookingsCount={activeBookingsCount} />
        )
      }
      screenOptions={{
        headerShown: false,
        tabBarPosition: isDesktopWeb ? 'top' : 'bottom',
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

const desktopStyles = StyleSheet.create({
  headerWrapper: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    width: '100%',
    zIndex: 100,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      },
    }),
  },
  headerInner: {
    maxWidth: 1140,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 20,
    height: 64,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandIconText: {
    fontSize: 20,
  },
  brandTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.3,
  },
  brandSubtitle: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  navTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  tabItemActive: {
    backgroundColor: '#eff6ff',
  },
  tabIcon: {
    fontSize: 16,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  tabLabelActive: {
    color: '#0284c7',
    fontWeight: '700',
  },
  badgePill: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 2,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  studentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0284c7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarChar: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  studentInfoCol: {
    flexDirection: 'column',
  },
  studentName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    maxWidth: 120,
  },
  studentCode: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '500',
  },
  langToggleBox: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 2,
  },
  langBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  langBtnActive: {
    backgroundColor: '#ffffff',
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  langText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  langTextActive: {
    color: '#0284c7',
    fontWeight: '700',
  },
});

const mobileStyles = StyleSheet.create({
  barContainer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.05)',
      } as any,
    }),
  },
  barInner: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingVertical: 2,
  },
  iconWrapper: {
    width: 28,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#0284c7',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  tabLabelActive: {
    fontWeight: '700',
  },
});


