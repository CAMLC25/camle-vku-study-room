import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  Platform,
  Dimensions,
} from 'react-native';
import { useDialogStore, DialogType } from '../store/useDialogStore';

export const AppDialog: React.FC = () => {
  const {
    isOpen,
    title,
    message,
    type,
    confirmText,
    cancelText,
    isDestructive,
    onConfirm,
    onCancel,
    hideDialog,
  } = useDialogStore();

  if (!isOpen) return null;

  const handleConfirm = async () => {
    hideDialog();
    if (onConfirm) {
      await onConfirm();
    }
  };

  const handleCancel = () => {
    hideDialog();
    if (onCancel) {
      onCancel();
    }
  };

  const getTypeStyles = (dialogType: DialogType) => {
    switch (dialogType) {
      case 'success':
        return {
          icon: '✓',
          iconBg: '#ecfdf5',
          iconColor: '#059669',
          borderTopColor: '#10b981',
        };
      case 'warning':
        return {
          icon: '⚠️',
          iconBg: '#fef3c7',
          iconColor: '#d97706',
          borderTopColor: '#f59e0b',
        };
      case 'error':
        return {
          icon: '✕',
          iconBg: '#fee2e2',
          iconColor: '#dc2626',
          borderTopColor: '#ef4444',
        };
      case 'confirm':
        return {
          icon: isDestructive ? '🗑️' : '❓',
          iconBg: isDestructive ? '#fee2e2' : '#e0f2fe',
          iconColor: isDestructive ? '#dc2626' : '#0284c7',
          borderTopColor: isDestructive ? '#ef4444' : '#0284c7',
        };
      case 'info':
      default:
        return {
          icon: 'ℹ️',
          iconBg: '#e0f2fe',
          iconColor: '#0284c7',
          borderTopColor: '#0284c7',
        };
    }
  };

  const config = getTypeStyles(type);
  const showCancelButton = type === 'confirm' || (Boolean(cancelText) && Boolean(onCancel));

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={showCancelButton ? handleCancel : handleConfirm} />

        <View style={[styles.dialogCard, { borderTopColor: config.borderTopColor }]}>
          {/* Icon Header */}
          <View style={[styles.iconCircle, { backgroundColor: config.iconBg }]}>
            <Text style={[styles.iconText, { color: config.iconColor }]}>{config.icon}</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Message */}
          {Boolean(message) && (
            <Text style={styles.message}>{message}</Text>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            {showCancelButton && (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleCancel}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelBtnText}>{cancelText || 'Hủy'}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.confirmBtn,
                isDestructive ? styles.confirmBtnDestructive : styles.confirmBtnPrimary,
                !showCancelButton && styles.confirmBtnFull,
              ]}
              onPress={handleConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmBtnText}>{confirmText || 'OK'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const { width } = Dimensions.get('window');
const maxCardWidth = Math.min(420, width - 40);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 9999,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dialogCard: {
    width: '100%',
    maxWidth: maxCardWidth,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    borderTopWidth: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      } as any,
    }),
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconText: {
    fontSize: 24,
    fontWeight: '800',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    paddingHorizontal: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmBtnFull: {
    flex: 1,
  },
  confirmBtnPrimary: {
    backgroundColor: '#0284c7',
  },
  confirmBtnDestructive: {
    backgroundColor: '#ef4444',
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
