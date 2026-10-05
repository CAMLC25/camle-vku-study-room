import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { QueryProvider } from './src/providers/QueryProvider';
import { notificationService } from './src/services/notificationService';
import { syncService } from './src/services/syncService';

import { AppDialog } from './src/components/AppDialog';
import { NotificationBanner } from './src/components/NotificationBanner';

export default function App() {
  useEffect(() => {
    // Initialize notification channels and set delegate for outbox sync
    notificationService.init();
    syncService.setNotificationDelegate(notificationService);
  }, []);

  return (
    <SafeAreaProvider>
      <QueryProvider>
        <StatusBar style="auto" />
        <RootNavigator />
        <AppDialog />
        <NotificationBanner />
      </QueryProvider>
    </SafeAreaProvider>
  );
}
