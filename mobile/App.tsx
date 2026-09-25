import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { NetworkProvider } from './src/context/NetworkContext';
import { SyncProvider } from './src/context/SyncContext';
import RootNavigator from './src/navigation';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NetworkProvider>
        <AuthProvider>
          <SyncProvider>
            <RootNavigator />
          </SyncProvider>
        </AuthProvider>
      </NetworkProvider>
    </SafeAreaProvider>
  );
}
