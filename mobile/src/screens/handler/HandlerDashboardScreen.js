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
import { apiClient } from '../../api/client.js';
import { useAuthStore } from '../../store/authStore.js';
import { confirmAlert } from '../../utils/confirmAlert.js';
import {
  HardHat,
  LogOut,
  MapPin,
  Car,
  Banknote,
  Scan,
  Clock,
  ArrowRight,
  TrendingUp,
} from '../../components/common/Icons.js';

export const HandlerDashboardScreen = ({ navigation }) => {
  const { user, logout } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);

  const fetchDashboardStats = useCallback(async () => {
    try {
      const res = await apiClient.get('/handler/dashboard');
      if (res.data?.data) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to load handler stats:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardStats();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchDashboardStats();
    });
    return unsubscribe;
  }, [fetchDashboardStats, navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardStats();
  };

  const handleLogout = () => {
    confirmAlert({
      title: 'Sign Out',
      message: 'Are you sure you want to log out of Booth Console?',
      confirmText: 'Log Out',
      onConfirm: () => logout(),
    });
  };

  const site = stats?.assignedSite;
  const today = stats?.today || { entries: 0, exits: 0, cashCollected: 0 };
  const slots = stats?.slots || { total: 0, available: 0, occupied: 0, reserved: 0 };
  const activeVehicles = stats?.activeVehicles || [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Top App Header */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <View style={styles.avatarBox}>
            <HardHat size={16} color="#fbbf24" />
          </View>
          <View>
            <Text style={styles.greeting}>PARKEASY BOOTH OFFICER</Text>
            <Text style={styles.handlerName}>{user?.name || 'Site Handler'}</Text>
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
        {/* Site Information Banner */}
        <View style={styles.siteCard}>
          <View style={styles.siteHeader}>
            <View style={{ flex: 1 }}>
              <View style={styles.boothStatusBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.boothStatusText}>ACTIVE BOOTH STATION</Text>
              </View>
              <Text style={styles.siteName}>{site?.name || 'Unassigned Station'}</Text>
              <Text style={styles.siteAddress}>
                {site
                  ? `${site.address}, ${site.area}`
                  : 'Contact administrator to link your station'}
              </Text>
            </View>
            <View style={styles.ratePill}>
              <Text style={styles.rateNumber}>₹{site?.hourlyRate || 0}</Text>
              <Text style={styles.rateUnit}>/ hour</Text>
            </View>
          </View>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Syncing booth metrics...</Text>
          </View>
        ) : (
          <>
            {/* Quick Stats Grid */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Today's Shift Activity</Text>
              <Text style={styles.sectionSubtitle}>Real-time barrier and cash telemetry</Text>
            </View>

            <View style={styles.statsGrid}>
              {/* Today's Entries */}
              <View style={styles.statBox}>
                <View style={[styles.statIconBadge, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                  <ArrowRight size={17} color="#34d399" />
                </View>
                <Text style={[styles.statValue, { color: '#34d399' }]}>{today.entries}</Text>
                <Text style={styles.statLabel}>Today Entries</Text>
              </View>

              {/* Today's Exits */}
              <View style={styles.statBox}>
                <View style={[styles.statIconBadge, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
                  <TrendingUp size={17} color="#60a5fa" />
                </View>
                <Text style={[styles.statValue, { color: '#60a5fa' }]}>{today.exits}</Text>
                <Text style={styles.statLabel}>Today Exits</Text>
              </View>

              {/* Cash Collected */}
              <View style={styles.statBox}>
                <View style={[styles.statIconBadge, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                  <Banknote size={17} color="#fbbf24" />
                </View>
                <Text style={[styles.statValue, { color: '#fbbf24' }]}>₹{today.cashCollected}</Text>
                <Text style={styles.statLabel}>Cash on Hand</Text>
              </View>

              {/* Active Parked */}
              <View style={styles.statBox}>
                <View style={[styles.statIconBadge, { backgroundColor: 'rgba(56, 189, 248, 0.12)' }]}>
                  <Car size={17} color="#38bdf8" />
                </View>
                <Text style={[styles.statValue, { color: '#38bdf8' }]}>{slots.occupied}</Text>
                <Text style={styles.statLabel}>Parked Now</Text>
              </View>
            </View>

            {/* Slot Utilization Breakdown */}
            <View style={styles.slotsCard}>
              <Text style={styles.subSectionTitle}>Parking Slot Status</Text>
              <View style={styles.slotRow}>
                <View style={styles.slotPill}>
                  <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
                  <Text style={styles.slotCount}>{slots.available}</Text>
                  <Text style={styles.slotText}>Free</Text>
                </View>

                <View style={styles.slotPill}>
                  <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
                  <Text style={styles.slotCount}>{slots.occupied}</Text>
                  <Text style={styles.slotText}>Occupied</Text>
                </View>

                <View style={styles.slotPill}>
                  <View style={[styles.dot, { backgroundColor: '#f59e0b' }]} />
                  <Text style={styles.slotCount}>{slots.reserved}</Text>
                  <Text style={styles.slotText}>Reserved</Text>
                </View>

                <View style={styles.slotPill}>
                  <View style={[styles.dot, { backgroundColor: '#64748b' }]} />
                  <Text style={styles.slotCount}>{slots.total}</Text>
                  <Text style={styles.slotText}>Total</Text>
                </View>
              </View>
            </View>

            {/* Quick Operations */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Quick Operations</Text>
              <Text style={styles.sectionSubtitle}>One-touch booth actions</Text>
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: 'rgba(37, 99, 235, 0.2)', borderColor: 'rgba(59, 130, 246, 0.4)' }]}
                onPress={() => navigation.navigate('Scanner', { mode: 'scan' })}
                activeOpacity={0.8}
              >
                <View style={[styles.actionIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.25)' }]}>
                  <Scan size={20} color="#60a5fa" />
                </View>
                <Text style={styles.actionBtnText}>Scan QR</Text>
                <Text style={styles.actionBtnSub}>Entry or Exit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.35)' }]}
                onPress={() => navigation.navigate('Scanner', { mode: 'recharge' })}
                activeOpacity={0.8}
              >
                <View style={[styles.actionIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.25)' }]}>
                  <Banknote size={20} color="#fbbf24" />
                </View>
                <Text style={styles.actionBtnText}>Recharge</Text>
                <Text style={styles.actionBtnSub}>Driver Cash</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.35)' }]}
                onPress={() => navigation.navigate('WalkIn')}
                activeOpacity={0.8}
              >
                <View style={[styles.actionIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.25)' }]}>
                  <Car size={20} color="#34d399" />
                </View>
                <Text style={styles.actionBtnText}>Walk-In</Text>
                <Text style={styles.actionBtnSub}>Direct Entry</Text>
              </TouchableOpacity>
            </View>

            {/* Currently Parked Vehicles */}
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Currently Parked ({activeVehicles.length})</Text>
                <Text style={styles.sectionSubtitle}>Active vehicles inside station</Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('SiteHistory')}
                style={styles.seeAllBtn}
              >
                <Text style={styles.seeAllText}>Shift Logs</Text>
                <ArrowRight size={12} color="#60a5fa" />
              </TouchableOpacity>
            </View>

            {activeVehicles.length === 0 ? (
              <View style={styles.emptyVehiclesCard}>
                <Clock size={24} color="#64748b" style={{ marginBottom: 6 }} />
                <Text style={styles.emptyText}>No vehicles currently parked at this station.</Text>
              </View>
            ) : (
              activeVehicles.map((item) => (
                <View key={item._id} style={styles.vehicleCard}>
                  <View style={styles.vehicleRow}>
                    <View style={styles.vehicleInfo}>
                      <View style={styles.plateBadge}>
                        <Text style={styles.plateText}>{item.vehicleNumber}</Text>
                      </View>
                      <Text style={styles.driverName}>
                        {item.user?.name || 'Walk-in Driver'} • {item.user?.phone || 'No phone'}
                      </Text>
                      <Text style={styles.entryTimeText}>
                        Entry:{' '}
                        {new Date(item.entryTime || item.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>

                    <View style={styles.vehicleRight}>
                      <View style={styles.slotBadge}>
                        <Text style={styles.slotBadgeText}>{item.slot?.slotNumber || 'Slot'}</Text>
                      </View>
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
  avatarBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    color: '#fbbf24',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  handlerName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
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
  siteCard: {
    marginBottom: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
  },
  siteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  boothStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  boothStatusText: {
    color: '#34d399',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  siteName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  siteAddress: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 3,
  },
  ratePill: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  rateNumber: {
    color: '#60a5fa',
    fontSize: 20,
    fontWeight: '800',
  },
  rateUnit: {
    color: '#64748b',
    fontSize: 10,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  statBox: {
    width: '48.5%',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  statIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  slotsCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    padding: 14,
    marginBottom: 20,
  },
  subSectionTitle: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
  },
  slotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  slotPill: {
    alignItems: 'center',
    flex: 1,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginBottom: 4,
  },
  slotCount: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  slotText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  actionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  actionBtnSub: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 10,
    marginTop: 2,
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
    gap: 3,
  },
  seeAllText: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyVehiclesCard: {
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
  vehicleCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 12,
    marginBottom: 8,
  },
  vehicleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleInfo: {
    flex: 1,
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
  driverName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  entryTimeText: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  vehicleRight: {
    alignItems: 'flex-end',
  },
  slotBadge: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  slotBadgeText: {
    color: '#34d399',
    fontSize: 13,
    fontWeight: '800',
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 10,
  },
});
