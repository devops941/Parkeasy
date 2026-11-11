import React from 'react';
import { useAuthStore } from '../store/authStore.js';
import { SplashScreen } from '../screens/auth/SplashScreen.js';
import { AuthNavigator } from './AuthNavigator.js';
import { UserTabs } from './UserTabs.js';
import { HandlerTabs } from './HandlerTabs.js';
import { AdminTabs } from './AdminTabs.js';

export const RootNavigator = () => {
  const { isInitialized, user, role } = useAuthStore();

  // Show splash while checking local auth storage
  if (!isInitialized) {
    return <SplashScreen />;
  }

  // Not logged in -> Show Auth stack
  if (!user) {
    return <AuthNavigator />;
  }

  // Dynamic role-based navigation router
  switch (role) {
    case 'admin':
      return <AdminTabs />;
    case 'handler':
      return <HandlerTabs />;
    case 'user':
    default:
      return <UserTabs />;
  }
};

