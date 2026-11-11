import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../../utils/theme.js';

export const Badge = ({ status, variant, text, label, style }) => {
  const badgeKey = (variant || status || 'available').toLowerCase();
  const displayText = label !== undefined ? label : text;

  const getBadgeColors = () => {
    switch (badgeKey) {
      case 'success':
      case 'available':
      case 'completed':
        return { bg: colors.successLight, text: colors.success, defaultLabel: 'Available' };
      case 'warning':
      case 'reserved':
      case 'booked':
        return { bg: colors.warningLight, text: colors.warning, defaultLabel: 'Reserved' };
      case 'error':
      case 'occupied':
      case 'active':
        return { bg: colors.errorLight, text: colors.error, defaultLabel: 'Occupied' };
      case 'info':
      case 'primary':
        return { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', defaultLabel: 'Active' };
      case 'disabled':
      case 'cancelled':
      case 'expired':
        return { bg: colors.surfaceLight, text: colors.textMuted, defaultLabel: 'Disabled' };
      case 'default':
      default:
        return { bg: colors.surfaceLight, text: colors.textSecondary, defaultLabel: badgeKey };
    }
  };

  const badgeConfig = getBadgeColors();

  return (
    <View style={[styles.badge, { backgroundColor: badgeConfig.bg }, style]}>
      <Text style={[styles.text, { color: badgeConfig.text }]}>
        {displayText || badgeConfig.defaultLabel}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});

