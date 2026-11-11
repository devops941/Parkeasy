import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Header } from '../../components/common/Header.js';
import { Card } from '../../components/common/Card.js';
import { Button } from '../../components/common/Button.js';
import { QRCodeDisplay } from '../../components/QR/QRCodeDisplay.js';
import { useAuthStore } from '../../store/authStore.js';
import { apiClient } from '../../api/client.js';
import { colors, spacing, typography } from '../../utils/theme.js';
import { confirmAlert } from '../../utils/confirmAlert.js';
import { Phone, Car, Star, Lock, ChevronRight } from '../../components/common/Icons.js';

export const UserProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuthStore();
  const [profileQrToken, setProfileQrToken] = useState(null);
  const [isLoadingQr, setIsLoadingQr] = useState(true);

  useEffect(() => {
    const fetchProfileQr = async () => {
      try {
        setIsLoadingQr(true);
        const res = await apiClient.get('/me/qr');
        setProfileQrToken(res.data.data.profileQrToken);
      } catch (err) {
        console.warn('Failed to load profile QR:', err.message);
      } finally {
        setIsLoadingQr(false);
      }
    };
    fetchProfileQr();
  }, []);

  const handleLogout = () => {
    confirmAlert({
      title: 'Sign Out',
      message: 'Are you sure you want to log out of ParkEasy?',
      confirmText: 'Sign Out',
      onConfirm: () => logout(),
    });
  };

  return (
    <View style={styles.container}>
      <Header title="My Profile" subtitle="Account details & QR card" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 1. User Info Header Card */}
        <Card style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'PE'}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.name || 'Car Owner'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
            <Phone size={12} color="#94a3b8" />
            <Text style={styles.userPhone}>{user?.phone || 'No phone registered'}</Text>
          </View>
          {user?.vehicleNumber ? (
            <View style={styles.vehicleBadge}>
              <Car size={13} color="#38bdf8" />
              <Text style={styles.vehicleText}>{user.vehicleNumber}</Text>
            </View>
          ) : null}
        </Card>

        {/* 2. My QR Code (for Handler Cash Recharge & Walk-ins) */}
        <Card style={styles.qrCard}>
          <Text style={styles.qrCardTitle}>My Profile QR Code</Text>
          <Text style={styles.qrCardSubtitle}>
            Show this QR to the booth attendant to recharge cash into your wallet or for instant walk-in check-in.
          </Text>

          {isLoadingQr ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
          ) : (
            <QRCodeDisplay
              value={profileQrToken}
              size={180}
              subtitle="Signed Identity Card • Safe & Encrypted"
            />
          )}
        </Card>

        {/* 3. Account Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => navigation.navigate('Feedback')}
            activeOpacity={0.8}
          >
            <View style={styles.actionIconBox}>
              <Star size={15} color="#fbbf24" fill="#fbbf24" />
            </View>
            <Text style={styles.actionLabel}>Send Feedback to Admin</Text>
            <ChevronRight size={16} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => navigation.navigate('ChangePassword')}
            activeOpacity={0.8}
          >
            <View style={styles.actionIconBox}>
              <Lock size={15} color="#60a5fa" />
            </View>
            <Text style={styles.actionLabel}>Change Password</Text>
            <ChevronRight size={16} color="#64748b" />
          </TouchableOpacity>

          <Button
            title="Log Out"
            variant="danger"
            onPress={handleLogout}
            style={styles.logoutBtn}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  profileCard: {
    alignItems: 'center',
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
  },
  userName: {
    ...typography.h2,
    color: colors.text,
  },
  userEmail: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  userPhone: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  vehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0a101f',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  vehicleText: {
    ...typography.caption,
    fontWeight: '700',
    color: '#38bdf8',
  },
  qrCard: {
    alignItems: 'center',
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  qrCardTitle: {
    ...typography.h3,
    color: colors.text,
  },
  qrCardSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  actionsContainer: {
    gap: spacing.sm,
  },
  actionRow: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  actionLabel: {
    flex: 1,
    ...typography.body,
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  actionArrow: {
    fontSize: 16,
    color: colors.textMuted,
  },
  logoutBtn: {
    marginTop: spacing.sm,
  },
});

