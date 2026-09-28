import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { useNotificationPreviewStore } from '../store/useNotificationPreviewStore';

export const NotificationBanner: React.FC = () => {
  const { isBannerVisible, activeNotification, hideBanner } =
    useNotificationPreviewStore();

  const slideAnim = React.useRef(new Animated.Value(-120)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isBannerVisible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 9,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss after 7 seconds
      const timer = setTimeout(() => {
        handleDismiss();
      }, 7000);

      return () => clearTimeout(timer);
    } else {
      slideAnim.setValue(-120);
      opacityAnim.setValue(0);
    }
  }, [isBannerVisible]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -120,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      hideBanner();
    });
  };

  if (!isBannerVisible || !activeNotification) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={styles.overlayContainer}>
      <Animated.View
        style={[
          styles.bannerCard,
          {
            transform: [{ translateY: slideAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        {/* Top Header Row (Mobile System Notification style) */}
        <View style={styles.headerRow}>
          <View style={styles.appBadge}>
            <View style={styles.appIconCircle}>
              <Text style={styles.appIconEmoji}>🔔</Text>
            </View>
            <Text style={styles.appName}>VKU STUDY ROOM</Text>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.timeLabel}>15m check-in alert</Text>
          </View>

          <TouchableOpacity
            style={styles.closeIconBtn}
            onPress={handleDismiss}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Close notification"
          >
            <Text style={styles.closeIconText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Content Body */}
        <View style={styles.bodyRow}>
          <Text style={styles.notificationTitle}>
            {activeNotification.title}
          </Text>
          <Text style={styles.notificationBody}>
            {activeNotification.body}
          </Text>
        </View>

        {/* Target Room Pill */}
        <View style={styles.roomTagRow}>
          <View style={styles.roomPill}>
            <Text style={styles.roomPillText}>
              🏫 {activeNotification.roomName}
            </Text>
          </View>
          <View style={styles.slotPill}>
            <Text style={styles.slotPillText}>
              ⏰ {activeNotification.slotLabel}
            </Text>
          </View>
        </View>

        {/* Action Button */}
        <View style={styles.footerRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleDismiss}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnText}>✓ Đã hiểu (Đóng)</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 16 : 46,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 999999,
  },
  bannerCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 12px 30px -4px rgba(15, 23, 42, 0.22)',
        }
      : {
          elevation: 10,
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.2,
          shadowRadius: 14,
        }),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  appBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIconEmoji: {
    fontSize: 12,
  },
  appName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284c7',
    letterSpacing: 0.6,
  },
  bulletDot: {
    fontSize: 12,
    color: '#94a3b8',
  },
  timeLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
  },
  closeIconBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIconText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
  },
  bodyRow: {
    marginBottom: 10,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 13,
    lineHeight: 19,
    color: '#334155',
  },
  roomTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  roomPill: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  roomPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1d4ed8',
  },
  slotPill: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  slotPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803d',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});
