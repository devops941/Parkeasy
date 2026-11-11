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
import { apiClient } from '../../api/client.js';
import { Badge } from '../../components/common/Badge.js';
import {
  Car,
  Banknote,
  FileText,
  Clock,
  Grid,
  User,
  ArrowRight,
} from '../../components/common/Icons.js';

export const HandlerHistoryScreen = () => {
  const [tab, setTab] = useState('parkings'); // 'parkings' | 'recharges'
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | 'week'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data
  const [parkings, setParkings] = useState([]);
  const [recharges, setRecharges] = useState([]);
  const [shiftSummary, setShiftSummary] = useState(null);

  const getDateRange = (filter) => {
    const now = new Date();
    if (filter === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { startDate: start.toISOString() };
    }
    if (filter === 'week') {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { startDate: start.toISOString() };
    }
    return {};
  };

  const fetchData = useCallback(async () => {
    try {
      const dateParams = getDateRange(dateFilter);

      if (tab === 'parkings') {
        const res = await apiClient.get('/handler/history', {
          params: { limit: 50, ...dateParams },
        });
        setParkings(res.data?.data?.bookings || []);
      } else {
        const res = await apiClient.get('/handler/recharges', {
          params: { limit: 50, ...dateParams },
        });
        setRecharges(res.data?.data?.recharges || []);
        setShiftSummary(res.data?.data?.shiftSummary || null);
      }
    } catch (err) {
      console.warn('Failed to fetch history:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab, dateFilter]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'active':
        return 'warning';
      case 'completed':
        return 'success';
      case 'booked':
        return 'info';
      case 'cancelled':
      case 'expired':
        return 'danger';
      default:
        return 'default';
    }
  };

  const renderParkingItem = ({ item }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.plateBadge}>
          <Car size={13} color="#38bdf8" />
          <Text style={styles.plateText}>{item.vehicleNumber}</Text>
        </View>
        <Badge variant={getStatusVariant(item.status)} label={item.status.toUpperCase()} />
      </View>

      <View style={styles.itemDetails}>
        <View style={styles.detailCol}>
          <View style={styles.detailColHeader}>
            <User size={11} color="#64748b" />
            <Text style={styles.detailLabel}>Driver</Text>
          </View>
          <Text style={styles.detailValue} numberOfLines={1}>{item.user?.name || 'Walk-In'}</Text>
        </View>

        <View style={styles.detailCol}>
          <View style={styles.detailColHeader}>
            <Grid size={11} color="#64748b" />
            <Text style={styles.detailLabel}>Slot</Text>
          </View>
          <Text style={styles.slotValue}>{item.slot?.slotNumber || '-'}</Text>
        </View>

        <View style={styles.detailCol}>
          <View style={styles.detailColHeader}>
            <Banknote size={11} color="#64748b" />
            <Text style={styles.detailLabel}>Fee Paid</Text>
          </View>
          <Text style={styles.feeValue}>₹{item.amount || 0}</Text>
        </View>
      </View>

      <View style={styles.itemFooter}>
        <View style={styles.dateRow}>
          <Clock size={11} color="#64748b" />
          <Text style={styles.dateText}>
            {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
            • {new Date(item.entryTime || item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        {item.paymentMode && (
          <Text style={styles.payModeText}>Mode: {item.paymentMode.toUpperCase()}</Text>
        )}
      </View>
    </View>
  );

  const renderRechargeItem = ({ item }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View>
          <Text style={styles.customerName}>{item.user?.name || 'Customer'}</Text>
          <Text style={styles.customerPhone}>{item.user?.phone || 'No phone'}</Text>
        </View>
        <Text style={styles.rechargeAmount}>+₹{item.amount}</Text>
      </View>

      <View style={styles.itemFooter}>
        <View style={styles.dateRow}>
          <Clock size={11} color="#64748b" />
          <Text style={styles.dateText}>
            {new Date(item.createdAt).toLocaleDateString()} at{' '}
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <Badge variant="success" label="CASH COLLECTED" />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Clock size={18} color="#3b82f6" />
          <Text style={styles.title}>Station Activity Logs</Text>
        </View>

        {/* Main Segment Tabs */}
        <View style={styles.tabToggle}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'parkings' && styles.tabBtnActive]}
            onPress={() => setTab('parkings')}
            activeOpacity={0.8}
          >
            <Car size={14} color={tab === 'parkings' ? '#ffffff' : '#94a3b8'} />
            <Text style={[styles.tabBtnText, tab === 'parkings' && styles.tabBtnTextActive]}>
              Parking History
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, tab === 'recharges' && styles.tabBtnActive]}
            onPress={() => setTab('recharges')}
            activeOpacity={0.8}
          >
            <Banknote size={14} color={tab === 'recharges' ? '#ffffff' : '#94a3b8'} />
            <Text style={[styles.tabBtnText, tab === 'recharges' && styles.tabBtnTextActive]}>
              Cash Recharges
            </Text>
          </TouchableOpacity>
        </View>

        {/* Date Filter Chips */}
        <View style={styles.filterRow}>
          {[
            { id: 'all', label: 'All Time' },
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'Last 7 Days' },
          ].map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterChip, dateFilter === f.id && styles.filterChipActive]}
              onPress={() => setDateFilter(f.id)}
              activeOpacity={0.8}
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

      {/* Shift Summary Card for Recharges Tab */}
      {tab === 'recharges' && shiftSummary && (
        <View style={styles.summaryBox}>
          <View>
            <Text style={styles.summaryLabel}>Total Cash Collected</Text>
            <Text style={styles.summarySub}>{shiftSummary.transactionCount} transactions</Text>
          </View>
          <Text style={styles.summaryValue}>₹{shiftSummary.totalCashCollected}</Text>
        </View>
      )}

      {loading && !refreshing ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Fetching logs...</Text>
        </View>
      ) : (
        <FlatList
          data={tab === 'parkings' ? parkings : recharges}
          keyExtractor={(item) => item._id}
          renderItem={tab === 'parkings' ? renderParkingItem : renderRechargeItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconBox}>
                <FileText size={28} color="#64748b" />
              </View>
              <Text style={styles.emptyTitle}>No records found</Text>
              <Text style={styles.emptySub}>No activity logs match the selected filter.</Text>
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
    backgroundColor: '#070b14',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: -0.3,
  },
  tabToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 12,
    padding: 3,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
  },
  tabBtnActive: {
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  tabBtnText: {
    color: '#94a3b8',
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
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.18)',
    borderColor: '#3b82f6',
  },
  filterChipText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#60a5fa',
    fontWeight: '700',
  },
  summaryBox: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    color: '#6ee7b7',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#34d399',
    fontSize: 22,
    fontWeight: '800',
  },
  summarySub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  itemCard: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  plateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0a101f',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  plateText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  detailCol: {
    flex: 1,
  },
  detailColHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  detailLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  detailValue: {
    color: '#f1f5f9',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  slotValue: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  feeValue: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dateText: {
    color: '#64748b',
    fontSize: 11,
  },
  payModeText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  customerName: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
  },
  customerPhone: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 1,
  },
  rechargeAmount: {
    color: '#10b981',
    fontSize: 19,
    fontWeight: '800',
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 10,
  },
  emptyBox: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIconBox: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  emptySub: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
});
