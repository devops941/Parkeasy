import React, { useEffect } from 'react';
import { Platform, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator.js';
import { colors } from './src/utils/theme.js';
import { registerForPushNotificationsAsync } from './src/utils/notifications.js';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <View style={boundaryStyles.container}>
          <Text style={boundaryStyles.title}>Unable to start ParkEasy</Text>
          <Text style={boundaryStyles.message}>
            {this.state.error?.message || 'Unexpected startup error'}
          </Text>
          <TouchableOpacity
            style={boundaryStyles.button}
            onPress={() => this.setState({ error: null })}
          >
            <Text style={boundaryStyles.buttonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const boundaryStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  message: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});

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
    <AppErrorBoundary>
      <SafeAreaProvider>
        <NavigationContainer theme={AppTheme} onStateChange={handleStateChange}>
          <StatusBar style="light" backgroundColor={colors.background} />
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
}
