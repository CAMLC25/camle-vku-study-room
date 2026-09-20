import { Alert, Platform } from 'react-native';

interface ConfirmDialogOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

/**
 * Cross-platform confirmation dialog that works reliably on both Web (window.confirm)
 * and Native iOS/Android (Alert.alert with button callbacks).
 */
export function showConfirmDialog({
  title,
  message = '',
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  onConfirm,
  onCancel,
}: ConfirmDialogOptions): void {
  if (Platform.OS === 'web') {
    const fullText = message ? `${title}\n\n${message}` : title;
    const isConfirmed = typeof window !== 'undefined' ? window.confirm(fullText) : true;
    if (isConfirmed) {
      onConfirm();
    } else {
      onCancel?.();
    }
  } else {
    Alert.alert(title, message, [
      {
        text: cancelText,
        style: 'cancel',
        onPress: onCancel,
      },
      {
        text: confirmText,
        style: 'destructive',
        onPress: onConfirm,
      },
    ]);
  }
}

/**
 * Cross-platform alert message.
 */
export function showAlertDialog(
  title: string,
  message?: string,
  onOk?: () => void
): void {
  if (Platform.OS === 'web') {
    const fullText = message ? `${title}\n\n${message}` : title;
    if (typeof window !== 'undefined') {
      window.alert(fullText);
    }
    onOk?.();
  } else {
    Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
  }
}
