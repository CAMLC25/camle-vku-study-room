import { create } from 'zustand';
import { Platform } from 'react-native';

export interface NotificationPayload {
  title: string;
  body: string;
  roomName: string;
  slotLabel: string;
  timestamp?: string;
}

interface NotificationPreviewState {
  // Floating banner alert state
  isBannerVisible: boolean;
  activeNotification: NotificationPayload | null;

  // Countdown timer state
  isCountingDown: boolean;
  countdownSeconds: number;
  initialSeconds: number;

  // Whether the test panel section is expanded / visible in Profile
  isTestPanelVisible: boolean;

  // Actions
  showBanner: (payload: NotificationPayload) => void;
  hideBanner: () => void;
  startCountdown: (
    seconds: number,
    onFinish: () => void,
    samplePayload?: Partial<NotificationPayload>
  ) => void;
  cancelCountdown: () => void;
  setCountdownSeconds: (sec: number) => void;
  toggleTestPanel: (visible?: boolean) => void;
}

let countdownInterval: any = null;

export const useNotificationPreviewStore = create<NotificationPreviewState>((set, get) => ({
  isBannerVisible: false,
  activeNotification: null,

  isCountingDown: false,
  countdownSeconds: 0,
  initialSeconds: 5,

  // Default to visible so user can try it immediately, can be hidden with 1-click
  isTestPanelVisible: true,

  showBanner: (payload: NotificationPayload) => {
    set({
      isBannerVisible: true,
      activeNotification: payload,
    });
  },

  hideBanner: () => {
    set({
      isBannerVisible: false,
      activeNotification: null,
    });
  },

  startCountdown: (seconds: number, onFinish: () => void, samplePayload?: Partial<NotificationPayload>) => {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }

    const duration = Math.max(1, Math.round(seconds));
    set({
      isCountingDown: true,
      countdownSeconds: duration,
      initialSeconds: duration,
    });

    countdownInterval = setInterval(() => {
      const current = get().countdownSeconds;
      if (current <= 1) {
        clearInterval(countdownInterval);
        countdownInterval = null;
        set({
          isCountingDown: false,
          countdownSeconds: 0,
        });

        // Trigger finish callback
        onFinish();
      } else {
        set({ countdownSeconds: current - 1 });
      }
    }, 1000);
  },

  cancelCountdown: () => {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
    set({
      isCountingDown: false,
      countdownSeconds: 0,
    });
  },

  setCountdownSeconds: (sec: number) => {
    set({ countdownSeconds: sec });
  },

  toggleTestPanel: (visible?: boolean) => {
    set((state) => ({
      isTestPanelVisible: visible !== undefined ? visible : !state.isTestPanelVisible,
    }));
  },
}));
