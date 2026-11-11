import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, spacing, typography } from '../../utils/theme.js';
import { apiClient } from '../../api/client.js';
import { Button } from '../../components/common/Button.js';
import { Badge } from '../../components/common/Badge.js';
import { Card } from '../../components/common/Card.js';
import {
  Car,
  Banknote,
  Camera,
  Scan,
  CheckCircle2,
  Wallet,
  QrCode,
  AlertCircle,
} from '../../components/common/Icons.js';

export const HandlerScannerScreen = ({ route, navigation }) => {
  const initialMode = route.params?.mode === 'recharge' ? 'recharge' : 'scan';
  const [mode, setMode] = useState(initialMode); // 'scan' (entry/exit) or 'recharge'
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(true);
  const [loading, setLoading] = useState(false);

  // Manual token modal for dev/emulator testing
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualToken, setManualToken] = useState('');

  // Result state
  const [resultData, setResultData] = useState(null);
  const [cashToCollect, setCashToCollect] = useState('');
  const [settlingCash, setSettlingCash] = useState(false);

  // Recharge amount selection
  const [rechargeAmount, setRechargeAmount] = useState('200');
  const [recharging, setRecharging] = useState(false);

  useEffect(() => {
    if (route.params?.mode) {
      setMode(route.params.mode === 'recharge' ? 'recharge' : 'scan');
    }
  }, [route.params?.mode]);

  const handleBarcodeScanned = async ({ data }) => {
    if (!isScanning || loading) return;
    setIsScanning(false);
    processScannedToken(data);
  };

  const processScannedToken = async (token) => {
    if (!token || !token.trim()) {
      Alert.alert('Empty Token', 'Please scan or enter a valid QR token.');
      setIsScanning(true);
      return;
    }

    setLoading(true);
    try {
      if (mode === 'recharge') {
        // Mode: Recharge wallet -> scan profile QR
        const res = await apiClient.post('/handler/scan', { qrToken: token.trim() });
        const data = res.data.data;
        if (data.type === 'profile_scanned' && data.customer) {
          setResultData({
            type: 'profile_for_recharge',
            customer: data.customer,
            activeBooking: data.activeBooking,
            token: token.trim(),
          });
        } else {
          Alert.alert('Notice', 'Scanned code is a parking ticket, not a customer profile QR.');
          setResultData(data);
        }
      } else {
        // Mode: Entry / Exit scan
        const res = await apiClient.post('/handler/scan', { qrToken: token.trim() });
        setResultData(res.data.data);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Scan failed';
      Alert.alert('Scan Failed', msg, [
        { text: 'Try Again', onPress: () => setIsScanning(true) },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Confirm cash settlement when shortfall exists
  const handleConfirmCashExit = async () => {
    if (!resultData?.bookingId) return;
    const amount = Number(cashToCollect || resultData.shortfall);
    if (!amount || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please confirm cash collected amount');
      return;
    }

    setSettlingCash(true);
    try {
      const res = await apiClient.post('/handler/exit/confirm-cash', {
        bookingId: resultData.bookingId,
        cashCollected: amount,
      });

      Alert.alert(
        'Exit Completed! ✅',
        `Cash ₹${amount} recorded and vehicle exit settled. Slot ${resultData.slotNumber || ''} is now available.`,
        [
          {
            text: 'Done',
            onPress: () => {
              setResultData(null);
              setIsScanning(true);
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to settle cash payment');
    } finally {
      setSettlingCash(false);
    }
  };

  // Confirm cash wallet recharge
  const handleConfirmRecharge = async () => {
    const amount = Number(rechargeAmount);
    if (!amount || amount < 10) {
      Alert.alert('Invalid Amount', 'Minimum recharge amount is ₹10');
      return;
    }

    setRecharging(true);
    try {
      const res = await apiClient.post('/handler/wallet/recharge', {
        profileQrToken: resultData.token,
        amount,
      });

      const updated = res.data.data;
      Alert.alert(
        'Recharge Successful',
        `₹${amount} credited to ${updated.user?.name || 'Customer'}'s wallet.\nNew Balance: ₹${updated.newWalletBalance}`,
        [
          {
            text: 'OK',
            onPress: () => {
              setResultData(null);
              setIsScanning(true);
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert('Recharge Failed', err.response?.data?.message || 'Failed to recharge wallet');
    } finally {
      setRecharging(false);
    }
  };

  const closeResultModal = () => {
    setResultData(null);
    setIsScanning(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header & Mode Switcher */}
      <View style={styles.header}>
        <Text style={styles.title}>Station QR Scanner</Text>
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'scan' && styles.modeTabActive]}
            onPress={() => {
              setMode('scan');
              setResultData(null);
              setIsScanning(true);
            }}
            activeOpacity={0.8}
          >
            <Car size={14} color={mode === 'scan' ? '#ffffff' : '#94a3b8'} />
            <Text style={[styles.modeTabText, mode === 'scan' && styles.modeTabTextActive]}>
              Entry / Exit
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, mode === 'recharge' && styles.modeTabActive]}
            onPress={() => {
              setMode('recharge');
              setResultData(null);
              setIsScanning(true);
            }}
            activeOpacity={0.8}
          >
            <Banknote size={14} color={mode === 'recharge' ? '#ffffff' : '#94a3b8'} />
            <Text style={[styles.modeTabText, mode === 'recharge' && styles.modeTabTextActive]}>
              Cash Recharge
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Camera Viewfinder */}
      <View style={styles.cameraContainer}>
        {!permission ? (
          <View style={styles.permissionBox}>
            <ActivityIndicator color="#3b82f6" />
            <Text style={styles.permissionText}>Checking camera permissions...</Text>
          </View>
        ) : !permission.granted ? (
          <View style={styles.permissionBox}>
            <View style={styles.permissionIconCircle}>
              <Camera size={32} color="#60a5fa" />
            </View>
            <Text style={styles.permissionTitle}>Camera Scanner</Text>
            <Text style={styles.permissionSub}>
              {Platform.OS === 'web'
                ? 'Web camera is optional. You can grant access or directly paste QR tokens below.'
                : 'Enable camera access to scan customer parking tickets and profile QR codes.'}
            </Text>
            <Button
              title={Platform.OS === 'web' ? 'Test Token Manually' : 'Grant Permission'}
              onPress={Platform.OS === 'web' ? () => setShowManualModal(true) : requestPermission}
              style={{ marginTop: 16 }}
            />
          </View>
        ) : (
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
            onBarcodeScanned={isScanning ? handleBarcodeScanned : undefined}
          >
            {/* Overlay target box */}
            <View style={styles.overlay}>
              <View style={styles.scanTargetBox}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
              </View>
              <Text style={styles.scanTip}>
                {mode === 'scan'
                  ? 'Point at Parking Ticket QR or Profile QR'
                  : 'Point at Customer Profile QR ("My QR")'}
              </Text>
            </View>
          </CameraView>
        )}

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.loadingOverlayText}>Verifying signed QR code...</Text>
          </View>
        )}
      </View>

      {/* Bottom Manual Controls */}
      <View style={styles.bottomControls}>
        <TouchableOpacity
          style={styles.manualBtn}
          onPress={() => setShowManualModal(true)}
        >
          <Text style={styles.manualBtnText}>⌨️ Paste / Test QR Token Manually</Text>
        </TouchableOpacity>

        {!isScanning && !resultData && !loading && (
          <Button
            title="Resume Scanning"
            onPress={() => setIsScanning(true)}
            style={{ marginTop: 10 }}
          />
        )}
      </View>

      {/* Manual Input Modal for Emulator Testing */}
      <Modal visible={showManualModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Test QR Token</Text>
            <Text style={styles.modalSub}>
              Paste a signed JWT QR token (Ticket QR or Profile QR) to test scanner logic:
            </Text>
            <TextInput
              style={styles.manualInput}
              placeholder="Paste token string here..."
              placeholderTextColor={colors.textMuted}
              value={manualToken}
              onChangeText={setManualToken}
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalBtns}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setShowManualModal(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Process Token"
                onPress={() => {
                  setShowManualModal(false);
                  processScannedToken(manualToken);
                }}
                style={{ flex: 1, marginLeft: 8 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Result Bottom Sheet Modal */}
      <Modal visible={!!resultData} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.resultCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* SCENARIO 1: ENTRY SUCCESS */}
              {resultData?.action === 'entry' && (
                <View>
                  <View style={styles.resultHeader}>
                    <Badge variant="success" label="ENTRY GRANTED" />
                    <Text style={styles.resultSuccessTitle}>Vehicle Entry Confirmed!</Text>
                  </View>

                  <Card style={styles.infoBox}>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Vehicle Number</Text>
                      <Text style={styles.plateTextLarge}>{resultData.vehicleNumber}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Assigned Slot</Text>
                      <Text style={styles.slotTextLarge}>{resultData.slotNumber}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Driver</Text>
                      <Text style={styles.infoValue}>
                        {resultData.customer?.name} ({resultData.customer?.phone})
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Entry Time</Text>
                      <Text style={styles.infoValue}>
                        {new Date(resultData.entryTime).toLocaleTimeString()}
                      </Text>
                    </View>
                  </Card>

                  <Button
                    title="Admit Vehicle & Next Scan"
                    onPress={closeResultModal}
                    style={{ marginTop: 16 }}
                  />
                </View>
              )}

              {/* SCENARIO 2: EXIT SETTLED (AUTO-DEDUCTED FROM WALLET) */}
              {resultData?.action === 'exit' && resultData?.settled && (
                <View>
                  <View style={styles.resultHeader}>
                    <Badge variant="success" label="EXIT SETTLED" />
                    <Text style={styles.resultSuccessTitle}>Wallet Auto-Deducted! ✅</Text>
                  </View>

                  <Card style={styles.infoBox}>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Duration</Text>
                      <Text style={styles.infoValue}>{resultData.parkingDurationHours} hr(s)</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Total Bill</Text>
                      <Text style={styles.amountLarge}>₹{resultData.totalAmount}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Paid Via</Text>
                      <Text style={[styles.infoValue, { color: colors.success }]}>
                        User Wallet (₹{resultData.deductedFromWallet})
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Remaining User Balance</Text>
                      <Text style={styles.infoValue}>₹{resultData.customerWalletRemaining}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Slot Released</Text>
                      <Text style={styles.slotTextLarge}>{resultData.slotNumber}</Text>
                    </View>
                  </Card>

                  <Button
                    title="Open Gate & Next Scan"
                    onPress={closeResultModal}
                    style={{ marginTop: 16 }}
                  />
                </View>
              )}

              {/* SCENARIO 3: EXIT SHORTFALL (INSUFFICIENT BALANCE -> COLLECT CASH) */}
              {resultData?.action === 'exit' && !resultData?.settled && (
                <View>
                  <View style={styles.resultHeader}>
                    <Badge variant="warning" label="CASH PAYMENT REQUIRED" />
                    <Text style={styles.resultWarningTitle}>Insufficient Wallet Balance ⚠️</Text>
                  </View>

                  <Card style={styles.shortfallBox}>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Vehicle</Text>
                      <Text style={styles.infoValue}>{resultData.vehicleNumber}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Duration</Text>
                      <Text style={styles.infoValue}>{resultData.parkingDurationHours} hr(s)</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Total Amount</Text>
                      <Text style={styles.infoValue}>₹{resultData.totalAmount}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Wallet Deducted</Text>
                      <Text style={styles.infoValue}>₹{resultData.walletDeduction}</Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.shortfallHighlight}>
                      <Text style={styles.shortfallLabel}>Cash To Collect:</Text>
                      <Text style={styles.shortfallNumber}>₹{resultData.shortfall}</Text>
                    </View>
                  </Card>

                  <Text style={styles.cashInstructions}>
                    Collect ₹{resultData.shortfall} cash from driver, then tap confirm below:
                  </Text>

                  <Button
                    title={`Collect ₹${resultData.shortfall} Cash & Complete Exit`}
                    onPress={handleConfirmCashExit}
                    loading={settlingCash}
                    style={{ marginTop: 12, backgroundColor: colors.warning }}
                  />

                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={closeResultModal}
                    style={{ marginTop: 8 }}
                  />
                </View>
              )}

              {/* SCENARIO 4: CASH WALLET RECHARGE */}
              {resultData?.type === 'profile_for_recharge' && (
                <View>
                  <View style={styles.resultHeader}>
                    <Badge variant="info" label="CUSTOMER WALLET" />
                    <Text style={styles.resultSuccessTitle}>Cash Wallet Top-Up</Text>
                  </View>

                  <Card style={styles.infoBox}>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Customer</Text>
                      <Text style={styles.infoValue}>{resultData.customer.name}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Phone</Text>
                      <Text style={styles.infoValue}>{resultData.customer.phone}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Current Balance</Text>
                      <Text style={styles.amountLarge}>₹{resultData.customer.walletBalance}</Text>
                    </View>
                  </Card>

                  <Text style={styles.rechargeLabel}>Select Cash Received:</Text>
                  <View style={styles.chipsRow}>
                    {['100', '200', '500', '1000'].map((amt) => (
                      <TouchableOpacity
                        key={amt}
                        style={[
                          styles.amtChip,
                          rechargeAmount === amt && styles.amtChipActive,
                        ]}
                        onPress={() => setRechargeAmount(amt)}
                      >
                        <Text
                          style={[
                            styles.amtChipText,
                            rechargeAmount === amt && styles.amtChipTextActive,
                          ]}
                        >
                          +₹{amt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TextInput
                    style={styles.rechargeInput}
                    placeholder="Custom amount (₹)"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    value={rechargeAmount}
                    onChangeText={setRechargeAmount}
                  />

                  <Button
                    title={`Confirm Cash Received (₹${rechargeAmount || 0})`}
                    onPress={handleConfirmRecharge}
                    loading={recharging}
                    style={{ marginTop: 12, backgroundColor: colors.success }}
                  />

                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={closeResultModal}
                    style={{ marginTop: 8 }}
                  />
                </View>
              )}
            </ScrollView>
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
    marginBottom: 8,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 3,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  modeTabActive: {
    backgroundColor: colors.primary,
  },
  modeTabText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  modeTabTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  scanTargetBox: {
    width: 260,
    height: 260,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: colors.primaryLight,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  scanTip: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 24,
    textAlign: 'center',
    paddingHorizontal: 20,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bottomControls: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  manualBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  manualBtnText: {
    color: colors.primaryLight,
    fontSize: 13,
    fontWeight: '600',
  },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  permissionIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  permissionTitle: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  permissionSub: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlayText: {
    color: '#ffffff',
    fontSize: 14,
    marginTop: 12,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: 4,
  },
  modalSub: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 16,
  },
  manualInput: {
    backgroundColor: colors.surfaceLight,
    color: colors.text,
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalBtns: {
    flexDirection: 'row',
  },
  resultCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: '85%',
  },
  resultHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  resultSuccessTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: 8,
    textAlign: 'center',
  },
  resultWarningTitle: {
    ...typography.h2,
    color: colors.warning,
    marginTop: 8,
    textAlign: 'center',
  },
  infoBox: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  infoValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  plateTextLarge: {
    color: '#38bdf8',
    fontSize: 18,
    fontWeight: '700',
  },
  slotTextLarge: {
    color: colors.success,
    fontSize: 18,
    fontWeight: '700',
  },
  amountLarge: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  shortfallBox: {
    borderColor: colors.warning,
    borderWidth: 1,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  shortfallHighlight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shortfallLabel: {
    color: colors.warning,
    fontSize: 16,
    fontWeight: '700',
  },
  shortfallNumber: {
    color: colors.warning,
    fontSize: 24,
    fontWeight: '800',
  },
  cashInstructions: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 4,
  },
  rechargeLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  amtChip: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  amtChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  amtChipText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  amtChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  rechargeInput: {
    backgroundColor: colors.surfaceLight,
    color: colors.text,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
});

