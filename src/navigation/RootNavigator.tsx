import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { MainTabs } from './MainTabs';
import { RoomDetailScreen } from '../screens/RoomDetailScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerTintColor: '#0284c7',
          headerTitleStyle: {
            fontWeight: '700',
            color: '#0f172a',
          },
          headerBackTitle: 'Back',
        }}
      >
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="RoomDetail"
          component={RoomDetailScreen}
          options={{ title: 'Room Details' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
