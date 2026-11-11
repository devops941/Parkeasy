import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Header } from '../../components/common/Header.js';
import { Input } from '../../components/common/Input.js';
import { Button } from '../../components/common/Button.js';
import { useAuthStore } from '../../store/authStore.js';
import { colors, spacing, typography } from '../../utils/theme.js';

export const ChangePasswordScreen = ({ navigation }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [statusMessage, setStatusMessage] = useState(null);

  const { changePassword, logout, isLoading, error, clearError } = useAuthStore();

  const validate = () => {
    const errs = {};
    if (!currentPassword) {
      errs.currentPassword = 'Enter your current password';
    }
    if (!newPassword || newPassword.length < 6) {
      errs.newPassword = 'New password must be at least 6 characters';
    }
    if (newPassword !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    clearError();
    setStatusMessage(null);
    if (!validate()) return;

    const res = await changePassword(currentPassword, newPassword);
    if (res.success) {
      setStatusMessage('Password changed successfully. Please log in again with your new password.');
      setTimeout(() => {
        logout();
      }, 2000);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <Header
        title="Change Password"
        showBack
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        {statusMessage ? (
          <View style={styles.successBanner}>
            <Text style={styles.successBannerText}>{statusMessage}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <Input
            label="Current Password *"
            placeholder="Enter current password"
            value={currentPassword}
            onChangeText={(text) => {
              setCurrentPassword(text);
              if (errors.currentPassword) setErrors({ ...errors, currentPassword: null });
            }}
            secureTextEntry
            error={errors.currentPassword}
          />

          <Input
            label="New Password *"
            placeholder="At least 6 characters"
            value={newPassword}
            onChangeText={(text) => {
              setNewPassword(text);
              if (errors.newPassword) setErrors({ ...errors, newPassword: null });
            }}
            secureTextEntry
            error={errors.newPassword}
          />

          <Input
            label="Confirm New Password *"
            placeholder="Re-enter new password"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: null });
            }}
            secureTextEntry
            error={errors.confirmPassword}
          />

          <Button
            title="Update Password"
            onPress={handleSubmit}
            loading={isLoading}
            style={styles.submitBtn}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
  },
  errorBanner: {
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorBannerText: {
    color: '#ffffff',
    fontSize: 13,
    textAlign: 'center',
  },
  successBanner: {
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  successBannerText: {
    color: '#ffffff',
    fontSize: 13,
    textAlign: 'center',
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  submitBtn: {
    marginTop: spacing.sm,
  },
});

