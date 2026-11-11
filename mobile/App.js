import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator.js';
import { colors } from './src/utils/theme.js';
import { registerForPushNotificationsAsync } from './src/utils/notifications.js';

const AppTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.primary,
  },
};

export default function App() {
  useEffect(() => {
    registerForPushNotificationsAsync();

    // Prevent aria-hidden accessibility warnings on Web when buttons retain focus across navigation transitions
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const handlePointerDown = (e) => {
        if (
          document.activeElement &&
          document.activeElement !== document.body &&
          document.activeElement !== e.target
        ) {
          document.activeElement.blur?.();
        }
      };
      document.addEventListener('pointerdown', handlePointerDown, { passive: true });
      return () => {
        document.removeEventListener('pointerdown', handlePointerDown);
      };
    }
  }, []);

  const handleStateChange = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur?.();
      }
    }
  };

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={AppTheme} onStateChange={handleStateChange}>
        <StatusBar style="light" backgroundColor={colors.background} />
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
