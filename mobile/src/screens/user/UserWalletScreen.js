import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Header } from '../../components/common/Header.js';
import { Card } from '../../components/common/Card.js';
import { Input } from '../../components/common/Input.js';
import { Button } from '../../components/common/Button.js';
import { DemoBanner } from '../../components/common/DemoBanner.js';
import { useAuthStore } from '../../store/authStore.js';
import { apiClient } from '../../api/client.js';
import { colors, spacing, typography } from '../../utils/theme.js';
import { Wallet, Car, Banknote } from '../../components/common/Icons.js';

export const UserWalletScreen = () => {
  const { user, updateUser } = useAuthStore();

  const [walletBalance, setWalletBalance] = useState(user?.walletBalance ?? 0);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rechargeAmount, setRechargeAmount] = useState('250');
  const [modalVisible, setModalVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Demo card inputs
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [expMonth, setExpMonth] = useState('12');
  const [expYear, setExpYear] = useState('2028');
  const [cvv, setCvv] = useState('123');

  const quickAmounts = [100, 250, 500, 1000];

  const fetchWalletData = async () => {
    try {
      setIsLoading(true);
      const [walletRes, historyRes] = await Promise.all([
        apiClient.get('/wallet'),
        apiClient.get('/wallet/history?limit=15'),
      ]);

      const bal = walletRes.data.data.walletBalance;
      setWalletBalance(bal);
      updateUser({ walletBalance: bal });
      setTransactions(historyRes.data.data.transactions || []);
    } catch (err) {
      console.warn('Failed to fetch wallet info:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  const handleStartRecharge = () => {
    const amt = parseFloat(rechargeAmount);
    if (isNaN(amt) || amt < 10) {
      Alert.alert('Invalid Amount', 'Please enter a recharge amount of at least ₹10.');
      return;
    }
    setModalVisible(true);
  };

  const handlePayDemoCard = async () => {
    try {
      setIsProcessing(true);
      const amt = parseFloat(rechargeAmount);

      // 1. Create Order
      const orderRes = await apiClient.post('/wallet/recharge/order', {
        amount: amt,
        idempotencyKey: `client_req_${Date.now()}`,
      });
      const orderId = orderRes.data.data.orderId;

      // 2. Pay via Simulated Gateway
      const payRes = await apiClient.post('/wallet/recharge/pay', {
        orderId,
        cardNumber,
        cardExpMonth: parseInt(expMonth, 10),
        cardExpYear: parseInt(expYear, 10),
        cvv,
        cardHolderName: user?.name || 'Car Owner',
      });

      const updatedBal = payRes.data.data.newWalletBalance;
      setWalletBalance(updatedBal);
      updateUser({ walletBalance: updatedBal });
      setModalVisible(false);

      Alert.alert(
        'Recharge Successful',
        `₹${amt} was credited to your wallet balance. New Balance: ₹${updatedBal}`
      );

      // Refresh ledger
      fetchWalletData();
    } catch (err) {
      const msg = err.response?.data?.message || 'Payment processing failed';
      Alert.alert('Payment Declined', msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="My Wallet" subtitle="Balance & card top-up" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <DemoBanner />

        {/* 1. Wallet Balance Hero Card */}
        <Card style={styles.heroCard}>
          <Text style={styles.heroLabel}>CURRENT WALLET BALANCE</Text>
          <Text style={styles.heroAmount}>₹{walletBalance.toFixed(2)}</Text>
          <Text style={styles.heroSub}>
            Auto-deducted at parking exit for contactless checkout.
          </Text>
        </Card>

        {/* 2. Quick Recharge Box */}
        <Card style={styles.rechargeCard}>
          <Text style={styles.sectionTitle}>Add Money to Wallet</Text>
          <View style={styles.quickPillsRow}>
            {quickAmounts.map((amt) => (
              <TouchableOpacity
                key={amt}
                style={[
                  styles.quickPill,
                  rechargeAmount === String(amt) && styles.activeQuickPill,
                ]}
                onPress={() => setRechargeAmount(String(amt))}
              >
                <Text
                  style={[
                    styles.quickPillText,
                    rechargeAmount === String(amt) && styles.activeQuickPillText,
                  ]}
                >
                  +₹{amt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Recharge Amount (₹)"
            placeholder="Enter amount"
            value={rechargeAmount}
            onChangeText={setRechargeAmount}
            keyboardType="numeric"
          />

          <Button
            title={`Top-Up ₹${rechargeAmount || 0}`}
            onPress={handleStartRecharge}
            style={styles.rechargeBtn}
          />
        </Card>

        {/* 3. Transaction History */}
        <Text style={styles.historyHeading}>Transaction History</Text>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />
        ) : transactions.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>No transaction records yet</Text>
          </Card>
        ) : (
          transactions.map((txn) => {
            const isCredit = txn.type === 'recharge' || txn.type === 'refund';
            return (
              <Card key={txn._id} style={styles.txnCard}>
                <View style={styles.txnLeft}>
                  <View style={[styles.txnIconCircle, isCredit ? styles.txnIconCredit : styles.txnIconDebit]}>
                    {txn.type === 'recharge' ? (
                      <Wallet size={16} color="#34d399" />
                    ) : (
                      <Car size={16} color="#38bdf8" />
                    )}
                  </View>
                  <View>
                    <Text style={styles.txnTitle}>
                      {txn.type === 'recharge'
                        ? 'Wallet Top-Up'
                        : txn.type === 'parking'
                        ? 'Parking Deduction'
                        : 'Refund'}
                    </Text>
                    <Text style={styles.txnDate}>
                      {new Date(txn.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })} • {txn.method === 'handler_cash' ? 'Cash @ Booth' : 'Card / Online'}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.txnAmount,
                    { color: isCredit ? colors.success : colors.error },
                  ]}
                >
                  {isCredit ? `+₹${txn.amount}` : `-₹${txn.amount}`}
                </Text>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* 4. Demo Payment Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>Demo Card Checkout</Text>
            <DemoBanner text="Test card 4242 4242 4242 4242 succeeds. No real money charged." />

            <Input
              label="Card Number"
              value={cardNumber}
              onChangeText={setCardNumber}
              keyboardType="numeric"
            />

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Input
                label="MM"
                value={expMonth}
                onChangeText={setExpMonth}
                keyboardType="numeric"
                style={{ flex: 1 }}
              />
              <Input
                label="YYYY"
                value={expYear}
                onChangeText={setExpYear}
                keyboardType="numeric"
                style={{ flex: 1 }}
              />
              <Input
                label="CVV"
                value={cvv}
                onChangeText={setCvv}
                keyboardType="numeric"
                secureTextEntry
                style={{ flex: 1 }}
              />
            </View>

            <Button
              title={`Pay ₹${rechargeAmount}`}
              onPress={handlePayDemoCard}
              loading={isProcessing}
              style={{ marginTop: spacing.sm }}
            />

            <Button
              title="Cancel"
              variant="outline"
              onPress={() => setModalVisible(false)}
              disabled={isProcessing}
              style={{ marginTop: spacing.sm }}
            />
          </Card>
        </View>
      </Modal>
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
  heroCard: {
    backgroundColor: '#162850',
    borderColor: colors.primary,
    padding: spacing.lg,
    borderRadius: 20,
    marginBottom: spacing.md,
  },
  heroLabel: {
    ...typography.caption,
    color: colors.primaryLight,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroAmount: {
    fontSize: 38,
    fontWeight: '800',
    color: '#ffffff',
    marginVertical: spacing.xs,
  },
  heroSub: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  rechargeCard: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  quickPillsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  quickPill: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeQuickPill: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  quickPillText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  activeQuickPillText: {
    color: '#ffffff',
  },
  rechargeBtn: {
    marginTop: spacing.xs,
  },
  historyHeading: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  txnCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  txnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  txnIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  txnIconCredit: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  txnIconDebit: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  txnTitle: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  txnDate: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  txnAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptyCard: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: 20,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
});

