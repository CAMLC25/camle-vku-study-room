import { create } from 'zustand';
import { NetworkState, SyncState } from '../types/sync';

interface NetworkStoreState {
  network: NetworkState;
  sync: SyncState;
  isSimulatedOffline: boolean;
  setNetworkState: (state: Partial<NetworkState>) => void;
  setSyncState: (state: Partial<SyncState>) => void;
  setSimulatedOffline: (isSimulated: boolean) => void;
}

export const useNetworkStore = create<NetworkStoreState>((set) => ({
  network: {
    isConnected: true,
    isInternetReachable: true,
    lastOnlineAt: new Date().toISOString(),
  },
  sync: {
    isSyncing: false,
    lastSyncedAt: null,
    pendingCount: 0,
  },
  isSimulatedOffline: false,
  setNetworkState: (updates) =>
    set((state) => ({
      network: { ...state.network, ...updates },
    })),
  setSyncState: (updates) =>
    set((state) => ({
      sync: { ...state.sync, ...updates },
    })),
  setSimulatedOffline: (isSimulated) =>
    set({ isSimulatedOffline: isSimulated }),
}));
