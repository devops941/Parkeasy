import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../utils/theme.js';
import { apiClient } from '../../api/client.js';
import { useAuthStore } from '../../store/authStore.js';
import { Button } from '../../components/common/Button.js';
import { Card } from '../../components/common/Card.js';
import { Badge } from '../../components/common/Badge.js';
import { QRCodeDisplay } from '../../components/QR/QRCodeDisplay.js';

export const HandlerWalkinScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [durationHours, setDurationHours] = useState(2);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Success ticket modal
  const [createdTicket, setCreatedTicket] = useState(null);

  useEffect(() => {
    fetchAvailableSlots();
  }, []);

  const fetchAvailableSlots = async () => {
    if (!user?.assignedSite) return;
    setLoadingSlots(true);
    try {
      const res = await apiClient.get(`/parking/sites/${user.assignedSite}/slots`);
      const slots = res.data?.data?.slots || [];
      const freeSlots = slots.filter((s) => s.status === 'available');
      setAvailableSlots(freeSlots);
      if (freeSlots.length > 0 && !selectedSlotId) {
        setSelectedSlotId(freeSlots[0]._id);
      }
    } catch (err) {
      console.warn('Failed to load slots:', err.message);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleWalkinSubmit = async () => {
    if (!vehicleNumber.trim()) {
      Alert.alert('Missing Field', 'Please enter vehicle license plate number');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.post('/handler/bookings', {
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        name: driverName.trim() || undefined,
        phone: driverPhone.trim() || undefined,
        slotId: selectedSlotId || undefined,
        bookedHours: Number(durationHours),
      });

      const data = res.data.data;
      setCreatedTicket(data);
      // Reset form
      setVehicleNumber('');
      setDriverName('');
      setDriverPhone('');
      fetchAvailableSlots();
    } catch (err) {
      Alert.alert('Walk-in Failed', err.response?.data?.message || 'Could not check in walk-in vehicle');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Walk-In Booth Check-In</Text>
        <Text style={styles.subtitle}>Immediate entry for unbooked arriving vehicles</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Vehicle Registration */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Vehicle Details</Text>
          <Text style={styles.inputLabel}>License Plate Number *</Text>
          <TextInput
            style={styles.plateInput}
            placeholder="KA-01-AB-1234"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            value={vehicleNumber}
            onChangeText={setVehicleNumber}
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.inputLabel}>Driver Name (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Walk-in Guest"
                placeholderTextColor={colors.textMuted}
                value={driverName}
                onChangeText={setDriverName}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.inputLabel}>Phone (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="9876543210"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={driverPhone}
                onChangeText={setDriverPhone}
              />
            </View>
          </View>
        </Card>

        {/* Expected Duration */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Estimated Duration</Text>
          <View style={styles.chipsRow}>
            {[1, 2, 4, 8].map((hrs) => (
              <TouchableOpacity
                key={hrs}
                style={[
                  styles.durationChip,
                  durationHours === hrs && styles.durationChipActive,
                ]}
                onPress={() => setDurationHours(hrs)}
              >
                <Text
                  style={[
                    styles.durationChipText,
                    durationHours === hrs && styles.durationChipTextActive,
                  ]}
                >
                  {hrs} {hrs === 1 ? 'Hour' : 'Hours'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Slot Selector */}
        <Card style={styles.card}>
          <View style={styles.slotHeaderRow}>
            <Text style={styles.cardTitle}>Assign Parking Slot</Text>
            {loadingSlots && <ActivityIndicator size="small" color={colors.primaryLight} />}
          </View>

          {availableSlots.length === 0 ? (
            <Text style={styles.noSlotsText}>
              {loadingSlots ? 'Loading slots...' : 'No available slots at this station!'}
            </Text>
          ) : (
            <View style={styles.slotGrid}>
              {availableSlots.map((slot) => (
                <TouchableOpacity
                  key={slot._id}
                  style={[
                    styles.slotPill,
                    selectedSlotId === slot._id && styles.slotPillSelected,
                  ]}
                  onPress={() => setSelectedSlotId(slot._id)}
                >
                  <Text
                    style={[
                      styles.slotPillText,
                      selectedSlotId === slot._id && styles.slotPillTextSelected,
                    ]}
                  >
                    {slot.slotNumber}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Card>

        {/* Action Button */}
        <Button
          title="Admit Vehicle & Generate Ticket"
          onPress={handleWalkinSubmit}
          loading={submitting}
          disabled={availableSlots.length === 0}
          style={{ marginTop: 8 }}
        />
      </ScrollView>

      {/* Generated Ticket QR Modal */}
      <Modal visible={!!createdTicket} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Badge variant="success" label="TICKET ISSUED" />
              <Text style={styles.ticketTitle}>Walk-In Ticket Created!</Text>
              <Text style={styles.ticketSubtitle}>
                Driver can scan or photograph this QR code for exit verification
              </Text>
            </View>

            {createdTicket?.ticketQrToken && (
              <View style={styles.qrWrapper}>
                <QRCodeDisplay
                  value={createdTicket.ticketQrToken}
                  size={200}
                />
              </View>
            )}

            <Card style={styles.ticketSummary}>
              <View style={styles.ticketRow}>
                <Text style={styles.ticketLabel}>Vehicle</Text>
                <Text style={styles.ticketPlate}>
                  {createdTicket?.booking?.vehicleNumber}
                </Text>
              </View>
              <View style={styles.ticketRow}>
                <Text style={styles.ticketLabel}>Slot Number</Text>
                <Text style={styles.ticketSlot}>
                  {createdTicket?.slotNumber}
                </Text>
              </View>
              <View style={styles.ticketRow}>
                <Text style={styles.ticketLabel}>Entry Timestamp</Text>
                <Text style={styles.ticketValue}>
                  {new Date(createdTicket?.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </Card>

            <Button
              title="Done / Next Walk-In"
              onPress={() => setCreatedTicket(null)}
              style={{ marginTop: 16 }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.h3,
    color: colors.text,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 40,
  },
  card: {
    marginBottom: spacing.md,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  plateInput: {
    backgroundColor: colors.surfaceLight,
    color: '#38bdf8',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 2,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#38bdf8',
    marginBottom: 12,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  textInput: {
    backgroundColor: colors.surfaceLight,
    color: colors.text,
    fontSize: 14,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  durationChip: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  durationChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  durationChipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  durationChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  slotHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noSlotsText: {
    color: colors.error,
    fontSize: 13,
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  slotPillSelected: {
    backgroundColor: colors.successLight,
    borderColor: colors.success,
  },
  slotPillText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  slotPillTextSelected: {
    color: colors.success,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  ticketTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: 8,
  },
  ticketSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  qrWrapper: {
    alignItems: 'center',
    marginVertical: 12,
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    alignSelf: 'center',
  },
  ticketSummary: {
    marginBottom: 8,
  },
  ticketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  ticketLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  ticketPlate: {
    color: '#38bdf8',
    fontSize: 15,
    fontWeight: '700',
  },
  ticketSlot: {
    color: colors.success,
    fontSize: 15,
    fontWeight: '700',
  },
  ticketValue: {
    color: colors.text,
    fontSize: 13,
  },
});

