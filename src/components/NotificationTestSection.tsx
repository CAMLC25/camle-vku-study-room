import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNotificationPreviewStore } from '../store/useNotificationPreviewStore';
import { notificationService } from '../services/notificationService';

export const NotificationTestSection: React.FC = () => {
  const {
    isCountingDown,
    countdownSeconds,
    initialSeconds,
    isTestPanelVisible,
    startCountdown,
    cancelCountdown,
    showBanner,
    toggleTestPanel,
  } = useNotificationPreviewStore();

  const [selectedRoom, setSelectedRoom] = useState('A101 - Smart Seminar');
  const [selectedSlot, setSelectedSlot] = useState('Ca 1: 07:30 – 09:30');

  const handleStartCountdown = (seconds: number) => {
    // Also schedule native / web notification if available
    notificationService.scheduleTestNotification(seconds, {
      roomName: selectedRoom,
      slotLabel: selectedSlot,
    });

    startCountdown(
      seconds,
      () => {
        // Trigger both audio chime & in-app banner
        notificationService.triggerSampleAlert({
          roomName: selectedRoom,
          slotLabel: selectedSlot,
        });

        showBanner({
          title: '🔔 Nhắc nhở nhận phòng (Study Room Check-in)',
          body: `Ca mượn phòng ${selectedRoom} (${selectedSlot}) sẽ bắt đầu sau 15 phút! Vui lòng chuẩn bị mã QR để làm thủ tục check-in.`,
          roomName: selectedRoom,
          slotLabel: selectedSlot,
        });
      },
      {
        roomName: selectedRoom,
        slotLabel: selectedSlot,
      }
    );
  };

  // If user minimized or hid the panel
  if (!isTestPanelVisible) {
    return (
      <View style={styles.minimizedContainer}>
        <TouchableOpacity
          style={styles.minimizedBtn}
          onPress={() => toggleTestPanel(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.minimizedBtnText}>
            🧪 Mở công cụ thử nghiệm thông báo (Countdown)
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const progressPercent = initialSeconds > 0
    ? Math.max(0, Math.min(100, (countdownSeconds / initialSeconds) * 100))
    : 0;

  return (
    <View style={styles.container}>
      {/* Header with Title and Hide Toggle */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.badgeText}>PHASE 5 • DEV TOOL</Text>
          <Text style={styles.title}>🧪 Thử nghiệm thông báo (15 Phút trước)</Text>
          <Text style={styles.subtitle}>
            Bấm số giây đếm ngược để trải nghiệm thông báo nhắc nhở check-in mẫu
          </Text>
        </View>

        <TouchableOpacity
          style={styles.hideToggleBtn}
          onPress={() => toggleTestPanel(false)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Ẩn công cụ thử nghiệm"
        >
          <Text style={styles.hideToggleText}>👁️ Ẩn công cụ</Text>
        </TouchableOpacity>
      </View>

      {/* Sample Payload Details */}
      <View style={styles.sampleBox}>
        <Text style={styles.sampleBoxTitle}>Dữ liệu ca đặt mẫu:</Text>
        <View style={styles.sampleDetailRow}>
          <Text style={styles.sampleLabel}>• Phòng:</Text>
          <Text style={styles.sampleValue}>{selectedRoom}</Text>
        </View>
        <View style={styles.sampleDetailRow}>
          <Text style={styles.sampleLabel}>• Ca mượn:</Text>
          <Text style={styles.sampleValue}>{selectedSlot} (Báo trước: 07:15)</Text>
        </View>
      </View>

      {/* Countdown Running State vs Idle Buttons */}
      {isCountingDown ? (
        <View style={styles.activeCountdownBox}>
          <View style={styles.countdownNumberRow}>
            <ActivityIndicator size="small" color="#0284c7" />
            <Text style={styles.countdownTitle}>
              Đang đếm ngược để phát thông báo...
            </Text>
            <View style={styles.countdownPill}>
              <Text style={styles.countdownNumberText}>
                ⏱️ {countdownSeconds}s
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progressPercent}%` },
              ]}
            />
          </View>

          <Text style={styles.countdownHint}>
            💡 Mẹo: Bạn có thể chuyển sang tab khác, thông báo dạng banner sẽ tự động trượt xuống từ đỉnh màn hình khi hết giờ!
          </Text>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={cancelCountdown}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelBtnText}>❌ Hủy đếm ngược</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.actionButtonsArea}>
          <Text style={styles.actionLabel}>Chọn số giây đếm ngược:</Text>
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.timerBtn}
              onPress={() => handleStartCountdown(3)}
              activeOpacity={0.7}
            >
              <Text style={styles.timerBtnIcon}>⚡</Text>
              <Text style={styles.timerBtnText}>3 Giây</Text>
              <Text style={styles.timerBtnSub}>(Xem ngay)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.timerBtn, styles.timerBtnHighlight]}
              onPress={() => handleStartCountdown(5)}
              activeOpacity={0.7}
            >
              <Text style={styles.timerBtnIcon}>⏱️</Text>
              <Text style={[styles.timerBtnText, styles.timerBtnTextHighlight]}>
                5 Giây
              </Text>
              <Text style={styles.timerBtnSub}>(Khuyên dùng)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.timerBtn}
              onPress={() => handleStartCountdown(10)}
              activeOpacity={0.7}
            >
              <Text style={styles.timerBtnIcon}>🕒</Text>
              <Text style={styles.timerBtnText}>10 Giây</Text>
              <Text style={styles.timerBtnSub}>(Thử đổi tab)</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: '#bae6fd',
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 4px 16px rgba(2, 132, 199, 0.08)',
        }
      : {
          elevation: 2,
          shadowColor: '#0284c7',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 6,
        }),
  },
  minimizedContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  minimizedBtn: {
    backgroundColor: '#f0f9ff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderStyle: 'dashed',
  },
  minimizedBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0284c7',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284c7',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  hideToggleBtn: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  hideToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  sampleBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sampleBoxTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  sampleDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  sampleLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  sampleValue: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '600',
  },
  actionButtonsArea: {},
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  timerBtn: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerBtnHighlight: {
    backgroundColor: '#f0f9ff',
    borderColor: '#0284c7',
  },
  timerBtnIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  timerBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  timerBtnTextHighlight: {
    color: '#0284c7',
  },
  timerBtnSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  activeCountdownBox: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#7dd3fc',
    alignItems: 'center',
  },
  countdownNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  countdownTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0369a1',
  },
  countdownPill: {
    backgroundColor: '#0284c7',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  countdownNumberText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  progressBarTrack: {
    width: '100%',
    height: 8,
    backgroundColor: '#e0f2fe',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0284c7',
    borderRadius: 4,
  },
  countdownHint: {
    fontSize: 11,
    color: '#0284c7',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 10,
  },
  cancelBtn: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
  },
});
