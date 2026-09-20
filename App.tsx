import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { notificationService } from './src/services/notificationService';
import { syncService } from './src/services/syncService';

export default function App() {
  useEffect(() => {
    // Initialize notification channels and set delegate for outbox sync
    notificationService.init();
    syncService.setNotificationDelegate(notificationService);
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </SafeAreaProvider>
  );
}
