import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../utils/theme.js';

export const DemoBanner = ({ text = 'Demo payment — no real money will be charged.' }) => {
  return (
    <View style={styles.banner}>
      <Text style={styles.icon}>ℹ️</Text>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#1e293b',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderRadius: 8,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  icon: {
    marginRight: spacing.sm,
    fontSize: 16,
  },
  text: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
});

