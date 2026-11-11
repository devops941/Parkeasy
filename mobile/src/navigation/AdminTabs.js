import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
import { colors } from '../utils/theme.js';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen.js';
import { AdminSitesScreen } from '../screens/admin/AdminSitesScreen.js';
import { AdminHandlersScreen } from '../screens/admin/AdminHandlersScreen.js';
import { AdminUsersScreen } from '../screens/admin/AdminUsersScreen.js';
import { AdminReportsScreen } from '../screens/admin/AdminReportsScreen.js';
import {
  BarChart3,
  MapPin,
  HardHat,
  Users,
  FileText,
} from '../components/common/Icons.js';

const Tab = createBottomTabNavigator();

export const AdminTabs = () => {
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
        component={AdminDashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color }) => <BarChart3 size={20} color={color} strokeWidth={2} />,
        }}
      />
      <Tab.Screen
        name="Sites"
        component={AdminSitesScreen}
        options={{
          tabBarLabel: 'Sites',
          tabBarIcon: ({ color }) => <MapPin size={20} color={color} strokeWidth={2} />,
        }}
      />
      <Tab.Screen
        name="Handlers"
        component={AdminHandlersScreen}
        options={{
          tabBarLabel: 'Handlers',
          tabBarIcon: ({ color }) => <HardHat size={20} color={color} strokeWidth={2} />,
        }}
      />
      <Tab.Screen
        name="Users"
        component={AdminUsersScreen}
        options={{
          tabBarLabel: 'Users',
          tabBarIcon: ({ color }) => <Users size={20} color={color} strokeWidth={2} />,
        }}
      />
      <Tab.Screen
        name="Reports"
        component={AdminReportsScreen}
        options={{
          tabBarLabel: 'Reports',
          tabBarIcon: ({ color }) => <FileText size={20} color={color} strokeWidth={2} />,
        }}
      />
    </Tab.Navigator>
  );
};
