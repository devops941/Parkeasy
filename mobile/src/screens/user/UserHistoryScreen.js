import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Header } from '../../components/common/Header.js';
import { Card } from '../../components/common/Card.js';
import { Badge } from '../../components/common/Badge.js';
import { Button } from '../../components/common/Button.js';
import { apiClient } from '../../api/client.js';
import { colors, spacing, typography } from '../../utils/theme.js';
import { useAuthStore } from '../../store/authStore.js';
import { Ticket, MapPin, Clock, CheckCircle2 } from '../../components/common/Icons.js';
import { useSocketEvent } from '../../hooks/useSocketEvent.js';

export const UserHistoryScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('current'); // 'current' | 'previous'
  const [currentBookings, setCurrentBookings] = useState([]);
  const [previousBookings, setPreviousBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [exitingId, setExitingId] = useState(null);
  const [authExpired, setAuthExpired] = useState(false);

  const fetchBookings = useCallback(async () => {
    try {
      const res = await apiClient.get('/parking/bookings/mine', {
        params: { type: 'all' },
      });
      const data = res.data?.data || {};
      const current = data.current || data.bookings || [];
      const previous = data.previous || [];
      setCurrentBookings(current);
      setPreviousBookings(previous);
      setAuthExpired(false);
    } catch (err) {
      if (err.response?.status === 401) {
        setAuthExpired(true);
      } else {
        console.warn('Failed to fetch user bookings:', err.message);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // 1. Fetch on mount & refetch on tab focus
  useEffect(() => {
    setIsLoading(true);
    fetchBookings();

    const unsubscribe = navigation.addListener('focus', () => {
      fetchBookings();
    });

    return unsubscribe;
  }, [navigation, fetchBookings]);

  // 2. Real-time sync via Socket.IO — refetch when any booking changes state
  useSocketEvent('booking:updated', () => {
    if (!authExpired) fetchBookings();
  });

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchBookings();
  };

  // Close/exit parking session from user side
  const handleExitParking = (booking) => {
    Alert.alert(
      'Exit Parking & Settle Fee',
      `Complete your parking session at "${booking.site?.name || 'Parking Station'}"?\n\nThe parking fee will be automatically deducted from your wallet balance.`,
      [
        { text: 'Keep Parked', style: 'cancel' },
        {
          text: 'Confirm & Exit',
          style: 'default',
          onPress: async () => {
            try {
              setExitingId(booking._id);
              const res = await apiClient.post(`/parking/bookings/${booking._id}/exit`);
              Alert.alert(
                'Parking Completed',
                `Your parking session has ended successfully!\n\nFee Paid: ₹${res.data?.data?.totalAmount || 0}\nRemaining Balance: ₹${res.data?.data?.remainingWalletBalance ?? 'Updated'}`
              );
              fetchBookings();
            } catch (err) {
              Alert.alert(
                'Exit Failed',
                err.response?.data?.message || 'Could not close parking session'
              );
            } finally {
              setExitingId(null);
            }
          },
        },
      ]
    );
  };

  const calcDurationMinutes = (entryTime, createdAt) => {
    const start = new Date(entryTime || createdAt || Date.now());
    const now = new Date();
    const diffMs = Math.max(0, now.getTime() - start.getTime());
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'}`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m`;
  };

  const renderBookingCard = ({ item }) => {
    const isCurrent = item.status === 'booked' || item.status === 'active';
    const isActive = item.status === 'active';
    const isBooked = item.status === 'booked';
    const isExiting = exitingId === item._id;

    return (
      <Card style={[styles.bookingCard, isActive && styles.activeCardBorder]}>
        {/* Status Header */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, marginRight: spacing.sm }}>
            <Text style={styles.siteName}>{item.site?.name || 'Parking Spot'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <MapPin size={11} color="#64748b" />
              <Text style={styles.siteAddress}>
                {item.site?.area || 'Location'} • Slot: {item.slot?.slotNumber || 'Auto'}
              </Text>
            </View>
          </View>
          <Badge
            variant={isActive ? 'success' : isBooked ? 'warning' : 'default'}
            label={isActive ? 'PARKED INSIDE' : isBooked ? 'RESERVED' : item.status.toUpperCase()}
          />
        </View>

        {/* Active Session Info Banner */}
        {isActive && (
          <View style={styles.activeBanner}>
            <View style={styles.activePulseDot} />
            <Text style={styles.activeBannerText}>
              Vehicle Inside • Parked for ~{calcDurationMinutes(item.entryTime, item.createdAt)}
            </Text>
          </View>
        )}

        {/* Details Row */}
        <View style={styles.detailRow}>
          <View style={styles.col}>
            <Text style={styles.label}>VEHICLE</Text>
            <Text style={styles.val}>{item.vehicleNumber}</Text>
          </View>

          {item.status === 'completed' && item.exitTime ? (
            /* Completed: show TIME IN, TIME OUT, AMOUNT PAID */
            <>
              <View style={styles.col}>
                <Text style={styles.label}>TIME IN</Text>
                <Text style={styles.val}>
                  {new Date(item.entryTime || item.bookedFrom).toLocaleTimeString([], {
                    hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>TIME OUT</Text>
                <Text style={styles.valTimeOut}>
                  {new Date(item.exitTime).toLocaleTimeString([], {
                    hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>PAID</Text>
                <Text style={styles.valAmount}>₹{item.amount || 0}</Text>
              </View>
            </>
          ) : (
            /* Active / Booked: show single TIME + RATE */
            <>
              <View style={styles.col}>
                <Text style={styles.label}>TIME</Text>
                <Text style={styles.val}>
                  {new Date(item.entryTime || item.bookedFrom).toLocaleTimeString([], {
                    hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>RATE</Text>
                <Text style={styles.valAmount}>
                  ₹{item.site?.hourlyRate || 40}/hr
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Interactive Actions for Active/Current Bookings */}
        {isCurrent && (
          <View style={styles.cardActionsContainer}>
            {/* Show QR Button */}
            <TouchableOpacity
              style={styles.actionBtnOutline}
              onPress={() => {
                navigation.navigate('TicketQR', {
                  booking: item,
                  ticketQrToken: item.ticketQrToken,
                  slotNumber: item.slot?.slotNumber,
                  site: item.site,
                });
              }}
              activeOpacity={0.8}
            >
              <Ticket size={14} color="#38bdf8" />
              <Text style={styles.actionBtnOutlineText}>
                {isActive ? 'Show Exit QR to Officer' : 'Show Entry Ticket QR'}
              </Text>
            </TouchableOpacity>

            {/* Self-Exit Button if Vehicle is Inside */}
            {isActive && (
              <TouchableOpacity
                style={styles.actionBtnExit}
                onPress={() => handleExitParking(item)}
                disabled={isExiting}
                activeOpacity={0.8}
              >
                {isExiting ? (
                  <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 6 }} />
                ) : (
                  <CheckCircle2 size={14} color="#ffffff" style={{ marginRight: 6 }} />
                )}
                <Text style={styles.actionBtnExitText}>
                  {isExiting ? 'Closing...' : 'End Parking & Pay'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </Card>
    );
  };

  const displayList = activeTab === 'current' ? currentBookings : previousBookings;

  return (
    <View style={styles.container}>
      <Header title="My Bookings" subtitle="Active tickets & parking history" />

      {/* Tabs Switcher */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'current' && styles.activeTab]}
          onPress={() => setActiveTab('current')}
        >
          <Text style={[styles.tabText, activeTab === 'current' && styles.activeTabText]}>
            Active / Current ({currentBookings.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'previous' && styles.activeTab]}
          onPress={() => setActiveTab('previous')}
        >
          <Text style={[styles.tabText, activeTab === 'previous' && styles.activeTabText]}>
            Completed History ({previousBookings.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Helper Banner for Active Session */}
      {activeTab === 'current' && currentBookings.some((b) => b.status === 'active') && (
        <View style={styles.howToExitPill}>
          <Clock size={13} color="#38bdf8" />
          <Text style={styles.howToExitText}>
            To exit: Present QR to booth officer or tap "End Parking & Pay"
          </Text>
        </View>
      )}

      {authExpired ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ticket size={28} color="#f59e0b" />
          </View>
          <Text style={styles.emptyTitle}>Session Expired</Text>
          <Text style={styles.emptySub}>
            Your login session has expired. Please sign in again to view your tickets and active parking.
          </Text>
          <Button
            title="Sign In Again"
            onPress={() => useAuthStore.getState().logout()}
            style={{ marginTop: spacing.md, paddingHorizontal: 24 }}
          />
        </View>
      ) : isLoading && !isRefreshing ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.primaryLight} size="large" />
          <Text style={styles.loadingText}>Loading parking tickets...</Text>
        </View>
      ) : (
        <FlatList
          data={displayList}
          keyExtractor={(item) => item._id}
          renderItem={renderBookingCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primaryLight}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ticket size={28} color="#64748b" />
              </View>
              <Text style={styles.emptyTitle}>
                {activeTab === 'current' ? 'No Active Bookings' : 'No Previous History'}
              </Text>
              <Text style={styles.emptySub}>
                {activeTab === 'current'
                  ? 'Reserve a slot from the map to view your ticket QR here.'
                  : 'Completed parking sessions will appear here.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: spacing.xs,
    marginHorizontal: spacing.md,
    borderRadius: 14,
    marginBottom: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#ffffff',
  },
  howToExitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    marginHorizontal: spacing.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    marginBottom: spacing.sm,
  },
  howToExitText: {
    color: '#bae6fd',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  bookingCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: 16,
  },
  activeCardBorder: {
    borderWidth: 1.5,
    borderColor: '#10b981',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  siteName: {
    ...typography.h3,
    color: colors.text,
  },
  siteAddress: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginVertical: 6,
  },
  activePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  activeBannerText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceLight,
    padding: spacing.sm,
    borderRadius: 10,
    marginTop: spacing.xs,
  },
  col: {
    alignItems: 'flex-start',
  },
  label: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
  },
  val: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginTop: 2,
  },
  valTimeOut: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '700',
    color: '#34d399',
    marginTop: 2,
  },
  valAmount: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryLight,
    marginTop: 2,
  },
  cardActionsContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs + 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  actionBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  actionBtnOutlineText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  actionBtnExit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#059669',
    borderRadius: 10,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  actionBtnExitText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxl,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
  },
  emptySub: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    maxWidth: 240,
  },
});
