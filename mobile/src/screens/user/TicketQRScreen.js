import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { Header } from '../../components/common/Header.js';
import { Card } from '../../components/common/Card.js';
import { Badge } from '../../components/common/Badge.js';
import { Button } from '../../components/common/Button.js';
import { QRCodeDisplay } from '../../components/QR/QRCodeDisplay.js';
import { apiClient } from '../../api/client.js';
import { colors, spacing, typography } from '../../utils/theme.js';
import { useSocketEvent } from '../../hooks/useSocketEvent.js';

export const TicketQRScreen = ({ navigation, route }) => {
  const { booking, ticketQrToken, slotNumber, site } = route.params;

  const [bookingStatus, setBookingStatus] = useState(booking.status || 'booked');
  const [isCancelling, setIsCancelling] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Real-time status sync via Socket.IO — fires when handler scans entry or exit QR
  useSocketEvent('booking:updated', (payload) => {
    if (payload.bookingId !== booking._id.toString()) return;
    if (payload.status && payload.status !== bookingStatus) {
      setBookingStatus(payload.status);
    }
  });

  const canCancel = bookingStatus === 'booked';
  const isActive = bookingStatus === 'active';

  const handleExitParking = () => {
    Alert.alert(
      'Exit Parking & Settle Payment',
      `Complete your parking session at "${site?.name || 'Station'}"? The fee will be automatically deducted from your wallet balance.`,
      [
        { text: 'Keep Parked', style: 'cancel' },
        {
          text: 'Confirm & Exit',
          style: 'default',
          onPress: async () => {
            try {
              setIsExiting(true);
              const res = await apiClient.post(`/parking/bookings/${booking._id}/exit`);
              setBookingStatus('completed');
              Alert.alert(
                'Parking Completed',
                `Your parking session has ended successfully!\n\nFee Paid: ₹${res.data?.data?.totalAmount || 0}\nRemaining Balance: ₹${res.data?.data?.remainingWalletBalance ?? 'Updated'}`
              );
              navigation.navigate('MyBookings');
            } catch (err) {
              Alert.alert(
                'Exit Failed',
                err.response?.data?.message || 'Could not close parking session'
              );
            } finally {
              setIsExiting(false);
            }
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Reservation?',
      'Are you sure you want to cancel this booking? Your reserved slot will be released immediately.',
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsCancelling(true);
              await apiClient.post(`/parking/bookings/${booking._id}/cancel`);
              setBookingStatus('cancelled');
              Alert.alert('Booking Cancelled', 'Your reservation was cancelled and the slot has been released.');
              navigation.navigate('MyBookings');
            } catch (err) {
              Alert.alert(
                'Cancellation Failed',
                err.response?.data?.message || 'Unable to cancel this booking.'
              );
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Parking Ticket"
        subtitle={`Booking #${booking._id?.slice(-6)}`}
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 1. Ticket Card with Signed QR Code */}
        <Card style={styles.ticketCard}>
          <View style={styles.ticketHeader}>
            <View>
              <Text style={styles.siteTitle}>{site?.name || 'Parking Site'}</Text>
              <Text style={styles.siteLocation}>
                {site?.address ? `${site.address}, ${site.area}` : 'Confirmed Location'}
              </Text>
            </View>
            <Badge status={bookingStatus} />
          </View>

          {/* QR Display */}
          <View style={styles.qrContainer}>
            <QRCodeDisplay
              value={ticketQrToken}
              size={180}
              subtitle="Show this QR to the attendant at entry and exit"
            />
          </View>

          {/* Ticket Key Info Grid */}
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>ASSIGNED SLOT</Text>
              <Text style={styles.infoValueHighlight}>
                {slotNumber || booking.slot?.slotNumber || 'Assigned'}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>VEHICLE NO.</Text>
              <Text style={styles.infoValue}>{booking.vehicleNumber}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>BOOKED FROM</Text>
              <Text style={styles.infoValue}>
                {new Date(booking.bookedFrom).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>VALID UNTIL</Text>
              <Text style={styles.infoValue}>
                {new Date(booking.bookedUntil).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>

          {/* Rate reminder banner */}
          <View style={styles.rateNotice}>
            <Text style={styles.rateNoticeText}>
              Hourly Rate: ₹{site?.hourlyRate ?? 40}/hr • Minimum Charge: ₹{site?.minimumCharge ?? 20}
            </Text>
          </View>
        </Card>

        {/* 2. Free Cancel Action (before entry) */}
        {canCancel && (
          <Button
            title="Cancel Reservation (Free)"
            variant="danger"
            onPress={handleCancel}
            loading={isCancelling}
            style={styles.cancelBtn}
          />
        )}

        {/* 3. Exit / Close Parking Action (while parked inside) */}
        {isActive && (
          <Button
            title="🚗 End Parking & Pay"
            variant="primary"
            onPress={handleExitParking}
            loading={isExiting}
            style={styles.exitBtn}
          />
        )}

        <Button
          title="Done / Back to Home"
          variant="secondary"
          onPress={() => navigation.navigate('FindParking')}
          style={styles.homeBtn}
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
  ticketCard: {
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.md,
  },
  siteTitle: {
    ...typography.h3,
    color: colors.text,
  },
  siteLocation: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.surfaceLight,
    borderRadius: 14,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  infoItem: {
    width: '47%',
    padding: spacing.xs,
  },
  infoLabel: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
  },
  infoValue: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  infoValueHighlight: {
    ...typography.body,
    fontWeight: '700',
    color: colors.primaryLight,
    fontSize: 16,
    marginTop: 2,
  },
  rateNotice: {
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: 'rgba(30, 79, 216, 0.1)',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  rateNoticeText: {
    ...typography.caption,
    color: colors.primaryLight,
    textAlign: 'center',
  },
  cancelBtn: {
    marginBottom: spacing.sm,
  },
  exitBtn: {
    marginBottom: spacing.sm,
  },
  homeBtn: {
    marginBottom: spacing.xl,
  },
});

