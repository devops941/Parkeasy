import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../../utils/theme.js';
import { apiClient } from '../../api/client.js';
import { useAuthStore } from '../../store/authStore.js';
import { confirmAlert } from '../../utils/confirmAlert.js';
import {
  TrendingUp,
  MapPin,
  Grid,
  HardHat,
  Users,
  Activity,
  ChevronRight,
  LogOut,
  Crown,
  Clock,
} from '../../components/common/Icons.js';

export const AdminDashboardScreen = ({ navigation }) => {
  const { user, logout } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiClient.get('/admin/dashboard');
      if (res.data?.data) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to load admin stats:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchStats();
    });
    return unsubscribe;
  }, [fetchStats, navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const handleLogout = () => {
    confirmAlert({
      title: 'Sign Out',
      message: 'Are you sure you want to log out of Admin Console?',
      confirmText: 'Log Out',
      onConfirm: () => logout(),
    });
  };

  const overview = stats?.overview || {};
  const revenue = stats?.revenue || stats?.overview?.financials || {};
  const recentBookings = stats?.recentBookings || stats?.recentActivity?.bookings || [];

  const totalSites = overview.totalSites ?? overview.sites?.total ?? 0;
  const totalSlots = overview.totalSlots ?? overview.slots?.total ?? 0;
  const totalHandlers = overview.totalHandlers ?? 0;
  const totalUsers = overview.totalUsers ?? 0;
  const activeBookings = overview.activeBookings ?? overview.bookings?.active ?? 0;

  const totalRevenue = revenue.totalRevenue ?? revenue.totalWalletRecharged ?? overview.financials?.totalRevenue ?? 0;
  const todayRevenue = revenue.todayRevenue ?? overview.financials?.todayRevenue ?? 0;
  const monthRevenue = revenue.monthRevenue ?? overview.financials?.monthRevenue ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <View style={styles.adminAvatarBox}>
            <Crown size={16} color="#60a5fa" />
          </View>
          <View>
            <Text style={styles.badgeLabel}>PARKEASY ADMIN CONSOLE</Text>
            <Text style={styles.adminName}>{user?.name || 'System Admin'}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <LogOut size={13} color="#f87171" />
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading && !refreshing ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Syncing network metrics...</Text>
          </View>
        ) : (
          <>
            {/* Total System Revenue Hero Card */}
            <View style={styles.revenueCard}>
              <View style={styles.revenueTopRow}>
                <View style={styles.revenueTitleBox}>
                  <View style={styles.revenueIconBadge}>
                    <TrendingUp size={16} color="#60a5fa" />
                  </View>
                  <Text style={styles.revenueLabel}>Total System Revenue</Text>
                </View>
                <View style={styles.liveBadge}>
                  <View style={styles.livePulseDot} />
                  <Text style={styles.liveBadgeText}>LIVE METRICS</Text>
                </View>
              </View>

              <Text style={styles.revenueAmount}>₹{totalRevenue}</Text>

              <View style={styles.revenueMetricsRow}>
                <View style={styles.metricSubItem}>
                  <Text style={styles.metricSubLabel}>Today's Revenue</Text>
                  <Text style={styles.metricSubVal}>₹{todayRevenue}</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricSubItem}>
                  <Text style={styles.metricSubLabel}>This Month</Text>
                  <Text style={styles.metricSubVal}>₹{monthRevenue}</Text>
                </View>
              </View>
            </View>

            {/* Network Status Header */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Network Status</Text>
              <Text style={styles.sectionSubtitle}>Station and infrastructure capacity</Text>
            </View>

            {/* 4 Metrics Grid */}
            <View style={styles.grid}>
              {/* Parking Sites */}
              <TouchableOpacity
                style={styles.statCard}
                onPress={() => navigation.navigate('Sites')}
                activeOpacity={0.8}
              >
                <View style={styles.statCardHeader}>
                  <View style={[styles.statIconBadge, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
                    <MapPin size={18} color="#60a5fa" />
                  </View>
                  <ChevronRight size={14} color="#475569" />
                </View>
                <Text style={styles.statNum}>{totalSites}</Text>
                <Text style={styles.statLabel}>Parking Sites</Text>
              </TouchableOpacity>

              {/* Total Slots */}
              <TouchableOpacity
                style={styles.statCard}
                onPress={() => navigation.navigate('Sites')}
                activeOpacity={0.8}
              >
                <View style={styles.statCardHeader}>
                  <View style={[styles.statIconBadge, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                    <Grid size={18} color="#34d399" />
                  </View>
                  <ChevronRight size={14} color="#475569" />
                </View>
                <Text style={[styles.statNum, { color: '#34d399' }]}>
                  {totalSlots}
                </Text>
                <Text style={styles.statLabel}>Total Slots</Text>
              </TouchableOpacity>

              {/* Booth Handlers */}
              <TouchableOpacity
                style={styles.statCard}
                onPress={() => navigation.navigate('Handlers')}
                activeOpacity={0.8}
              >
                <View style={styles.statCardHeader}>
                  <View style={[styles.statIconBadge, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                    <HardHat size={18} color="#fbbf24" />
                  </View>
                  <ChevronRight size={14} color="#475569" />
                </View>
                <Text style={[styles.statNum, { color: '#fbbf24' }]}>
                  {totalHandlers}
                </Text>
                <Text style={styles.statLabel}>Booth Handlers</Text>
              </TouchableOpacity>

              {/* Registered Users */}
              <TouchableOpacity
                style={styles.statCard}
                onPress={() => navigation.navigate('Users')}
                activeOpacity={0.8}
              >
                <View style={styles.statCardHeader}>
                  <View style={[styles.statIconBadge, { backgroundColor: 'rgba(168, 85, 247, 0.12)' }]}>
                    <Users size={18} color="#c084fc" />
                  </View>
                  <ChevronRight size={14} color="#475569" />
                </View>
                <Text style={[styles.statNum, { color: '#c084fc' }]}>
                  {totalUsers}
                </Text>
                <Text style={styles.statLabel}>Registered Users</Text>
              </TouchableOpacity>
            </View>

            {/* Active Operations Bar */}
            <View style={styles.activeCard}>
              <View style={styles.activeLeft}>
                <View style={styles.activeIconBox}>
                  <Activity size={18} color="#38bdf8" />
                </View>
                <View>
                  <Text style={styles.activeTitle}>Active Bookings Now</Text>
                  <Text style={styles.activeSub}>Vehicles currently parked or reserved</Text>
                </View>
              </View>
              <Text style={styles.activeNumber}>{activeBookings}</Text>
            </View>

            {/* Recent Bookings Feed */}
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Recent Network Bookings</Text>
                <Text style={styles.sectionSubtitle}>Live stream of arriving and active vehicles</Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('Reports')}
                style={styles.seeAllBtn}
              >
                <Text style={styles.seeAllText}>All Reports</Text>
                <ChevronRight size={13} color="#60a5fa" />
              </TouchableOpacity>
            </View>

            {recentBookings.length === 0 ? (
              <View style={styles.emptyCard}>
                <Clock size={24} color="#64748b" style={{ marginBottom: 6 }} />
                <Text style={styles.emptyText}>No recent booking activity detected.</Text>
              </View>
            ) : (
              recentBookings.map((b) => (
                <View key={b._id} style={styles.bookingCard}>
                  <View style={styles.bookingRow}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.plateBadge}>
                        <Text style={styles.plateText}>{b.vehicleNumber}</Text>
                      </View>
                      <Text style={styles.siteText}>{b.site?.name || 'Parking Station'}</Text>
                      <Text style={styles.userText}>
                        {b.user?.name || 'Driver'} • {b.user?.phone || 'No phone'}
                      </Text>
                    </View>
                    <View style={styles.bookingRight}>
                      <View
                        style={[
                          styles.statusBadge,
                          b.status === 'completed'
                            ? styles.statusCompleted
                            : b.status === 'active'
                            ? styles.statusActive
                            : styles.statusBooked,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            b.status === 'completed'
                              ? { color: '#34d399' }
                              : b.status === 'active'
                              ? { color: '#fbbf24' }
                              : { color: '#60a5fa' },
                          ]}
                        >
                          {b.status.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.timeText}>
                        {new Date(b.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070b14',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.07)',
    backgroundColor: 'rgba(11, 17, 32, 0.85)',
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  adminAvatarBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLabel: {
    color: '#60a5fa',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  adminName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  logoutBtnText: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  revenueCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
  },
  revenueTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  revenueTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  revenueIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  revenueLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  liveBadgeText: {
    color: '#34d399',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  revenueAmount: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
    marginVertical: 10,
  },
  revenueMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 10,
    marginTop: 4,
  },
  metricSubItem: {
    flex: 1,
  },
  metricSubLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '500',
  },
  metricSubVal: {
    color: '#e2e8f0',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 16,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  statCard: {
    width: '48.5%',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNum: {
    fontSize: 22,
    fontWeight: '800',
    color: '#60a5fa',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  activeCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  activeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  activeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  activeSub: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  activeNumber: {
    color: '#fbbf24',
    fontSize: 24,
    fontWeight: '900',
    paddingLeft: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  seeAllText: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '600',
  },
  bookingCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 12,
    marginBottom: 8,
  },
  bookingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  plateBadge: {
    backgroundColor: '#030712',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#38bdf8',
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  plateText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  siteText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  userText: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  bookingRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  statusActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  statusBooked: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timeText: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 12,
  },
  centerLoading: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 10,
  },
});
