import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../utils/theme.js';
import { apiClient } from '../../api/client.js';
import { Card } from '../../components/common/Card.js';
import { Badge } from '../../components/common/Badge.js';
import { Car, Banknote, Star, FileText } from '../../components/common/Icons.js';

export const AdminReportsScreen = () => {
  const [activeTab, setActiveTab] = useState('bookings'); // 'bookings' | 'recharges' | 'feedback'
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | 'week' | 'month'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data
  const [bookings, setBookings] = useState([]);
  const [recharges, setRecharges] = useState([]);
  const [feedbackList, setFeedbackList] = useState([]);

  const getDateParams = (filter) => {
    const now = new Date();
    if (filter === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { startDate: start.toISOString() };
    }
    if (filter === 'week') {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { startDate: start.toISOString() };
    }
    if (filter === 'month') {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { startDate: start.toISOString() };
    }
    return {};
  };

  const fetchData = useCallback(async () => {
    try {
      const dateParams = getDateParams(dateFilter);

      if (activeTab === 'bookings') {
        const res = await apiClient.get('/admin/reports/parking-history', {
          params: { limit: 50, ...dateParams },
        });
        setBookings(res.data?.data?.bookings || []);
      } else if (activeTab === 'recharges') {
        const res = await apiClient.get('/admin/reports/recharge-history', {
          params: { limit: 50, ...dateParams },
        });
        setRecharges(res.data?.data?.recharges || res.data?.data?.transactions || []);
      } else if (activeTab === 'feedback') {
        const res = await apiClient.get('/admin/reports/feedback', {
          params: { limit: 50, ...dateParams },
        });
        setFeedbackList(res.data?.data?.feedback || []);
      }
    } catch (err) {
      console.warn('Failed to load reports:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, dateFilter]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // 1. Render Booking Row
  const renderBookingItem = ({ item }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.plateBadge}>
          <Text style={styles.plateText}>{item.vehicleNumber}</Text>
        </View>
        <Badge
          variant={item.status === 'completed' ? 'success' : item.status === 'active' ? 'warning' : 'default'}
          label={item.status.toUpperCase()}
        />
      </View>

      <View style={styles.detailsRow}>
        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>Site</Text>
          <Text style={styles.detailValue}>{item.site?.name || 'Site'}</Text>
        </View>
        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>Slot</Text>
          <Text style={styles.slotValue}>{item.slot?.slotNumber || '-'}</Text>
        </View>
        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>Revenue</Text>
          <Text style={styles.amountValue}>₹{item.amount || 0}</Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.dateText}>
          {new Date(item.createdAt).toLocaleDateString()} • {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        {item.paymentMode && (
          <Text style={styles.modeText}>Paid: {item.paymentMode.toUpperCase()}</Text>
        )}
      </View>
    </Card>
  );

  // 2. Render Recharge Row
  const renderRechargeItem = ({ item }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.userName}>{item.user?.name || 'Customer'}</Text>
          <Text style={styles.userSub}>{item.user?.phone || item.user?.email || 'No contact'}</Text>
        </View>
        <Text style={styles.rechargeAmount}>+₹{item.amount}</Text>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.dateText}>
          {new Date(item.createdAt).toLocaleDateString()} at{' '}
          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <Badge
          variant={item.method === 'handler_cash' ? 'warning' : 'success'}
          label={item.method === 'handler_cash' ? 'BOOTH CASH' : 'CARD GATEWAY'}
        />
      </View>
    </Card>
  );

  // 3. Render Feedback Row
  const renderFeedbackItem = ({ item }) => {
    const stars = '⭐'.repeat(item.rating || 5);

    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.userName}>{item.user?.name || 'Anonymous'}</Text>
            <Text style={styles.userSub}>{item.user?.phone || item.user?.email}</Text>
          </View>
          <Text style={styles.starText}>{stars}</Text>
        </View>

        <Text style={styles.commentText}>"{item.comment || 'No comment provided'}"</Text>

        <View style={styles.footerRow}>
          <Text style={styles.dateText}>
            {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
          <Badge variant="info" label={`${item.rating}/5 RATING`} />
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.title}>System Reports & Audits</Text>

        {/* 3 Main Segment Tabs */}
        <View style={styles.tabToggle}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'bookings' && styles.tabBtnActive]}
            onPress={() => setActiveTab('bookings')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'bookings' && styles.tabBtnTextActive]}>
              🚗 Bookings
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'recharges' && styles.tabBtnActive]}
            onPress={() => setActiveTab('recharges')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'recharges' && styles.tabBtnTextActive]}>
              💵 Recharges
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'feedback' && styles.tabBtnActive]}
            onPress={() => setActiveTab('feedback')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'feedback' && styles.tabBtnTextActive]}>
              ⭐ Feedback
            </Text>
          </TouchableOpacity>
        </View>

        {/* Date Filter Pills */}
        <View style={styles.filterRow}>
          {[
            { id: 'all', label: 'All' },
            { id: 'today', label: 'Today' },
            { id: 'week', label: '7 Days' },
            { id: 'month', label: '30 Days' },
          ].map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterChip, dateFilter === f.id && styles.filterChipActive]}
              onPress={() => setDateFilter(f.id)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  dateFilter === f.id && styles.filterChipTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.primaryLight} />
          <Text style={styles.loadingText}>Compiling reports...</Text>
        </View>
      ) : (
        <FlatList
          data={
            activeTab === 'bookings'
              ? bookings
              : activeTab === 'recharges'
              ? recharges
              : feedbackList
          }
          keyExtractor={(item) => item._id}
          renderItem={
            activeTab === 'bookings'
              ? renderBookingItem
              : activeTab === 'recharges'
              ? renderRechargeItem
              : renderFeedbackItem
          }
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryLight} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>📊</Text>
              <Text style={styles.emptyTitle}>No records in this period</Text>
              <Text style={styles.emptySub}>Try selecting "All" or a broader date filter.</Text>
            </View>
          }
        />
      )}
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    marginBottom: 8,
  },
  tabToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 3,
    marginBottom: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
  },
  tabBtnText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  tabBtnTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.surface,
    borderColor: colors.primaryLight,
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  filterChipTextActive: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 40,
  },
  card: {
    marginBottom: 10,
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  plateBadge: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  plateText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '700',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.surfaceLight,
  },
  detailCol: {
    flex: 1,
  },
  detailLabel: {
    color: colors.textMuted,
    fontSize: 11,
  },
  detailValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  slotValue: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  amountValue: {
    color: colors.warning,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  dateText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  modeText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  userName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  userSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  rechargeAmount: {
    color: colors.success,
    fontSize: 20,
    fontWeight: '800',
  },
  starText: {
    fontSize: 14,
  },
  commentText: {
    color: colors.text,
    fontSize: 14,
    fontStyle: 'italic',
    marginVertical: 10,
    lineHeight: 20,
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 10,
  },
  emptyBox: {
    alignItems: 'center',
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  emptySub: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
});

