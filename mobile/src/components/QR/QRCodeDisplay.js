import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors, spacing, typography } from '../../utils/theme.js';

export const QRCodeDisplay = ({ value, size = 200, title, subtitle }) => {
  if (!value) {
    return (
      <View style={[styles.container, { width: size + 32, height: size + 32 }]}>
        <Text style={styles.errorText}>No QR Data Available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      <View style={styles.qrWrapper}>
        <QRCode
          value={value}
          size={size}
          color="#000000"
          backgroundColor="#ffffff"
        />
      </View>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  qrWrapper: {
    padding: spacing.md,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
    maxWidth: 240,
  },
  errorText: {
    color: colors.textMuted,
    fontSize: 13,
  },
});

