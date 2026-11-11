import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
import { HandlerDashboardScreen } from '../screens/handler/HandlerDashboardScreen.js';
import { HandlerScannerScreen } from '../screens/handler/HandlerScannerScreen.js';
import { HandlerWalkinScreen } from '../screens/handler/HandlerWalkinScreen.js';
import { HandlerHistoryScreen } from '../screens/handler/HandlerHistoryScreen.js';
import {
  BarChart3,
  Scan,
  Car,
  Clock,
} from '../components/common/Icons.js';

const Tab = createBottomTabNavigator();

export const HandlerTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0a0f1d',
          borderTopColor: 'rgba(255, 255, 255, 0.08)',
          borderTopWidth: 1,
          height: Platform.OS === 'web' ? 72 : 82,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'web' ? 8 : 22,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.4,
          shadowRadius: 10,
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 3,
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          lineHeight: 14,
          marginTop: 2,
          marginBottom: 1,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={HandlerDashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color }) => <BarChart3 size={20} color={color} strokeWidth={2} />,
        }}
      />
      <Tab.Screen
        name="Scanner"
        component={HandlerScannerScreen}
        options={{
          tabBarLabel: 'Scanner',
          tabBarIcon: ({ color }) => <Scan size={20} color={color} strokeWidth={2} />,
        }}
      />
      <Tab.Screen
        name="WalkIn"
        component={HandlerWalkinScreen}
        options={{
          tabBarLabel: 'Walk-In',
          tabBarIcon: ({ color }) => <Car size={20} color={color} strokeWidth={2} />,
        }}
      />
      <Tab.Screen
        name="SiteHistory"
        component={HandlerHistoryScreen}
        options={{
          tabBarLabel: 'Logs',
          tabBarIcon: ({ color }) => <Clock size={20} color={color} strokeWidth={2} />,
        }}
      />
    </Tab.Navigator>
  );
};
