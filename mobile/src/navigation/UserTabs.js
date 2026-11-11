import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform } from 'react-native';

// User Screens
import { UserHomeScreen } from '../screens/user/UserHomeScreen.js';
import { UserSlotsScreen } from '../screens/user/UserSlotsScreen.js';
import { BookingConfirmScreen } from '../screens/user/BookingConfirmScreen.js';
import { TicketQRScreen } from '../screens/user/TicketQRScreen.js';
import { UserHistoryScreen } from '../screens/user/UserHistoryScreen.js';
import { UserWalletScreen } from '../screens/user/UserWalletScreen.js';
import { UserProfileScreen } from '../screens/user/UserProfileScreen.js';
import { UserFeedbackScreen } from '../screens/user/UserFeedbackScreen.js';
import { ChangePasswordScreen } from '../screens/auth/ChangePasswordScreen.js';

import { colors } from '../utils/theme.js';
import {
  Compass,
  Ticket,
  Wallet,
  User,
} from '../components/common/Icons.js';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const HistoryStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

// 1. Home / Map & Booking Flow Stack
const HomeStackNavigator = () => (
  <HomeStack.Navigator
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: colors.background },
      animation: 'slide_from_right',
    }}
  >
    <HomeStack.Screen name="HomeScreen" component={UserHomeScreen} />
    <HomeStack.Screen name="Slots" component={UserSlotsScreen} />
    <HomeStack.Screen name="BookingConfirm" component={BookingConfirmScreen} />
    <HomeStack.Screen name="TicketQR" component={TicketQRScreen} />
  </HomeStack.Navigator>
);

// 2. History & Active Tickets Stack
const HistoryStackNavigator = () => (
  <HistoryStack.Navigator
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: colors.background },
      animation: 'slide_from_right',
    }}
  >
    <HistoryStack.Screen name="HistoryList" component={UserHistoryScreen} />
    <HistoryStack.Screen name="TicketQR" component={TicketQRScreen} />
  </HistoryStack.Navigator>
);

// 3. Profile Stack (My QR, Feedback, Change Password)
const ProfileStackNavigator = () => (
  <ProfileStack.Navigator
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: colors.background },
      animation: 'slide_from_right',
    }}
  >
    <ProfileStack.Screen name="ProfileMain" component={UserProfileScreen} />
    <ProfileStack.Screen name="Feedback" component={UserFeedbackScreen} />
    <ProfileStack.Screen name="ChangePassword" component={ChangePasswordScreen} />
  </ProfileStack.Navigator>
);

// 4. Main Bottom Tab Bar for User (Car Owner)
export const UserTabs = () => {
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
        name="FindParking"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: 'Search',
          tabBarIcon: ({ color }) => <Compass size={20} color={color} strokeWidth={2} />,
        }}
      />
      <Tab.Screen
        name="MyBookings"
        component={HistoryStackNavigator}
        options={{
          tabBarLabel: 'Tickets',
          tabBarIcon: ({ color }) => <Ticket size={20} color={color} strokeWidth={2} />,
        }}
      />
      <Tab.Screen
        name="Wallet"
        component={UserWalletScreen}
        options={{
          tabBarLabel: 'Wallet',
          tabBarIcon: ({ color }) => <Wallet size={20} color={color} strokeWidth={2} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <User size={20} color={color} strokeWidth={2} />,
        }}
      />
    </Tab.Navigator>
  );
};
