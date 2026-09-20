import { useDialogStore, DialogType } from '../store/useDialogStore';

interface ConfirmDialogOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  type?: DialogType;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

/**
 * Cross-platform custom styled confirmation dialog.
 */
export function showConfirmDialog({
  title,
  message = '',
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  isDestructive = true,
  type = 'confirm',
  onConfirm,
  onCancel,
}: ConfirmDialogOptions): void {
  useDialogStore.getState().showDialog({
    title,
    message,
    type,
    confirmText,
    cancelText,
    isDestructive,
    onConfirm,
    onCancel,
  });
}

/**
 * Cross-platform custom styled alert / notification dialog.
 */
export function showAlertDialog(
  title: string,
  message?: string,
  onOk?: () => void,
  type: DialogType = 'info'
): void {
  useDialogStore.getState().showDialog({
    title,
    message,
    type,
    confirmText: 'OK',
    onConfirm: onOk,
  });
}
