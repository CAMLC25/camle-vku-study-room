import { useEffect, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useNetworkStore } from '../store/useNetworkStore';
import { syncService } from '../services/syncService';

export function useNetworkStatus() {
  const network = useNetworkStore((state) => state.network);
  const sync = useNetworkStore((state) => state.sync);
  const isSimulatedOffline = useNetworkStore((state) => state.isSimulatedOffline);
  const setNetworkState = useNetworkStore((state) => state.setNetworkState);
  const setSimulatedOffline = useNetworkStore((state) => state.setSimulatedOffline);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((netState) => {
      const isOnline = Boolean(netState.isConnected && netState.isInternetReachable !== false);
      const store = useNetworkStore.getState();

      if (!store.isSimulatedOffline) {
        const wasOnline = store.network.isConnected;
        // Avoid cascading updates if state hasn't changed
        if (wasOnline !== isOnline || store.network.isInternetReachable !== netState.isInternetReachable) {
          store.setNetworkState({
            isConnected: isOnline,
            isInternetReachable: netState.isInternetReachable,
            lastOnlineAt: isOnline ? new Date().toISOString() : store.network.lastOnlineAt,
          });

          // Trigger sequential flush if newly online
          if (isOnline && !wasOnline) {
            syncService.flushOutboxSequentially();
          }
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const toggleSimulatedOffline = useCallback(() => {
    const currentSimulated = useNetworkStore.getState().isSimulatedOffline;
    const nextVal = !currentSimulated;
    setSimulatedOffline(nextVal);

    if (nextVal) {
      // Enter offline simulation
      setNetworkState({
        isConnected: false,
        isInternetReachable: false,
      });
    } else {
      // Exit offline simulation and restore real network state
      NetInfo.fetch().then((netState) => {
        const isOnline = Boolean(netState.isConnected && netState.isInternetReachable !== false);
        setNetworkState({
          isConnected: isOnline,
          isInternetReachable: netState.isInternetReachable,
          lastOnlineAt: isOnline ? new Date().toISOString() : undefined,
        });
        if (isOnline) {
          syncService.flushOutboxSequentially();
        }
      });
    }
  }, [setNetworkState, setSimulatedOffline]);

  return {
    isConnected: network.isConnected,
    isInternetReachable: network.isInternetReachable,
    isSyncing: sync.isSyncing,
    lastOnlineAt: network.lastOnlineAt,
    pendingCount: sync.pendingCount,
    isSimulatedOffline,
    toggleSimulatedOffline,
    syncNow: () => syncService.flushOutboxSequentially(),
  };
}
