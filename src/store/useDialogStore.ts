import { create } from 'zustand';

export type DialogType = 'info' | 'success' | 'warning' | 'error' | 'confirm';

export interface DialogOptions {
  title: string;
  message?: string;
  type?: DialogType;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
  type: DialogType;
  confirmText: string;
  cancelText: string;
  isDestructive: boolean;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  showDialog: (options: DialogOptions) => void;
  hideDialog: () => void;
}

export const useDialogStore = create<DialogState>((set) => ({
  isOpen: false,
  title: '',
  message: '',
  type: 'info',
  confirmText: 'OK',
  cancelText: 'Hủy',
  isDestructive: false,
  onConfirm: undefined,
  onCancel: undefined,
  showDialog: (options) =>
    set({
      isOpen: true,
      title: options.title,
      message: options.message || '',
      type: options.type || (options.onConfirm && options.cancelText ? 'confirm' : 'info'),
      confirmText: options.confirmText || 'OK',
      cancelText: options.cancelText || 'Hủy',
      isDestructive: options.isDestructive ?? (options.type === 'confirm'),
      onConfirm: options.onConfirm,
      onCancel: options.onCancel,
    }),
  hideDialog: () => set({ isOpen: false }),
}));
