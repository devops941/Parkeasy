import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Header } from '../../components/common/Header.js';
import { Card } from '../../components/common/Card.js';
import { Input } from '../../components/common/Input.js';
import { Button } from '../../components/common/Button.js';
import { useAuthStore } from '../../store/authStore.js';
import { apiClient } from '../../api/client.js';
import { colors, spacing, typography } from '../../utils/theme.js';
import { notifyBookingConfirmed, notifyLowBalance } from '../../utils/notifications.js';
import { MapPin, Car } from '../../components/common/Icons.js';

export const BookingConfirmScreen = ({ navigation, route }) => {
  const { site, slot } = route.params;
  const { user } = useAuthStore();

  const [vehicleNumber, setVehicleNumber] = useState(user?.vehicleNumber || '');
  const [durationHours, setDurationHours] = useState(2);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Price Calculation: max(minimumCharge, hours * hourlyRate)
  const estimatedCost = Math.max(
    site.minimumCharge,
    durationHours * site.hourlyRate
  );

  const durationOptions = [1, 2, 4, 6, 8];

  const handleConfirmBooking = async () => {
    if (!vehicleNumber.trim()) {
      setError('Please provide your vehicle registration number');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const res = await apiClient.post('/parking/bookings', {
        siteId: site._id,
        slotId: slot?._id,
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        bookedHours: durationHours,
      });

      const { booking, ticketQrToken, slotNumber } = res.data.data;

      // Trigger local notification for confirmed booking
      notifyBookingConfirmed({
        siteName: site.name,
        slotNumber: slotNumber || slot?.slotNumber,
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
      });

      // Low balance check
      if ((user?.walletBalance || 0) < estimatedCost) {
        notifyLowBalance({ balance: user?.walletBalance || 0, threshold: estimatedCost });
      }

      // Navigate to Ticket QR Screen
      navigation.replace('TicketQR', {
        booking,
        ticketQrToken,
        slotNumber: slotNumber || slot?.slotNumber,
        site,
      });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Booking failed. The slot may have just been reserved. Please try again.';
      setError(msg);
      Alert.alert('Booking Error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Confirm Booking"
        subtitle="Review details & reserve slot"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* 1. Parking Site & Slot Summary Card */}
        <Card style={styles.summaryCard}>
          <Text style={styles.cardHeader}>PARKING LOCATION</Text>
          <Text style={styles.siteName}>{site.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <MapPin size={12} color="#94a3b8" />
            <Text style={styles.siteAddress}>
              {site.address}, {site.area} (PIN: {site.postalCode})
            </Text>
          </View>

          <View style={styles.slotDetailRow}>
            <View style={styles.slotPill}>
              <Text style={styles.slotPillLabel}>ASSIGNED SLOT</Text>
              <Text style={styles.slotPillValue}>
                {slot ? slot.slotNumber : 'Auto Assigned'}
              </Text>
            </View>
            <View style={styles.slotPill}>
              <Text style={styles.slotPillLabel}>HOURLY RATE</Text>
              <Text style={styles.slotPillValue}>₹{site.hourlyRate}/hr</Text>
            </View>
          </View>
        </Card>

        {/* 2. Vehicle Registration Number */}
        <Card style={styles.formCard}>
          <Text style={styles.cardHeader}>VEHICLE INFORMATION</Text>
          <Input
            label="Vehicle License Plate *"
            placeholder="e.g. KA-01-AB-1234"
            value={vehicleNumber}
            onChangeText={(text) => {
              setVehicleNumber(text);
              if (error) setError(null);
            }}
            autoCapitalize="characters"
          />
        </Card>

        {/* 3. Duration Selector */}
        <Card style={styles.formCard}>
          <Text style={styles.cardHeader}>ESTIMATED DURATION</Text>
          <Text style={styles.durationNote}>
            Final fee is calculated upon vehicle exit at ₹{site.hourlyRate}/hr (minimum ₹{site.minimumCharge}).
          </Text>

          <View style={styles.durationRow}>
            {durationOptions.map((h) => (
              <TouchableOpacity
                key={h}
                style={[
                  styles.durationChip,
                  durationHours === h && styles.activeDurationChip,
                ]}
                onPress={() => setDurationHours(h)}
              >
                <Text
                  style={[
                    styles.durationChipText,
                    durationHours === h && styles.activeDurationChipText,
                  ]}
                >
                  {h} hr{h > 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* 4. Price & Wallet Summary */}
        <Card style={styles.priceCard}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Estimated Total</Text>
            <Text style={styles.priceValue}>₹{estimatedCost}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.walletRow}>
            <Text style={styles.walletLabel}>
              Your Wallet Balance: ₹{user?.walletBalance ?? 0}
            </Text>
            <Text style={styles.walletHint}>
              {(user?.walletBalance ?? 0) >= estimatedCost
                ? '✅ Sufficient balance'
                : 'ℹ️ Cash settlement available at exit'}
            </Text>
          </View>
        </Card>

        {/* 5. Confirm Button */}
        <Button
          title={isLoading ? 'Reserving...' : `Confirm & Pay ₹${estimatedCost}`}
          onPress={handleConfirmBooking}
          loading={isLoading}
          style={styles.confirmBtn}
        />
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
  },
  errorBanner: {
    backgroundColor: colors.errorLight,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorText: {
    color: '#ffffff',
    fontSize: 13,
    textAlign: 'center',
  },
  summaryCard: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryLight,
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  siteName: {
    ...typography.h2,
    fontSize: 20,
    color: colors.text,
  },
  siteAddress: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  slotDetailRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  slotPill: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    padding: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  slotPillLabel: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
  },
  slotPillValue: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  formCard: {
    marginBottom: spacing.md,
  },
  durationNote: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  durationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  durationChip: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeDurationChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  durationChipText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeDurationChipText: {
    color: '#ffffff',
  },
  priceCard: {
    marginBottom: spacing.lg,
    backgroundColor: '#162238',
    borderColor: colors.primary,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  priceValue: {
    ...typography.h2,
    color: '#ffffff',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  walletRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  walletHint: {
    ...typography.caption,
    color: colors.success,
  },
  confirmBtn: {
    marginBottom: spacing.xl,
  },
});

