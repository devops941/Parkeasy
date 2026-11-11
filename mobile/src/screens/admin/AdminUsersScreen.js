import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiClient } from '../../api/client.js';
import { Badge } from '../../components/common/Badge.js';
import { confirmAlert } from '../../utils/confirmAlert.js';
import {
  Users,
  Search,
  Mail,
  Car,
  Wallet,
  Shield,
  Clock,
  UserCheck,
  XCircle,
  Trash2,
} from '../../components/common/Icons.js';

export const AdminUsersScreen = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await apiClient.get('/admin/users', {
        params: { limit: 50, search: search.trim() || undefined },
      });
      setUsers(res.data?.data?.users || []);
    } catch (err) {
      console.warn('Failed to load users:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const handleDeleteUser = (u) => {
    confirmAlert({
      title: 'Delete User',
      message: `Permanently delete ${u.name}'s account? This cannot be undone.`,
      confirmText: 'Delete',
      onConfirm: async () => {
        setDeletingId(u._id);
        try {
          await apiClient.delete(`/admin/users/${u._id}`);
          setUsers((prev) => prev.filter((x) => x._id !== u._id));
        } catch (err) {
          Alert.alert('Error', err.response?.data?.message || 'Failed to delete user');
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  const handleToggleStatus = (u) => {
    const actionName = u.isActive ? 'Deactivate' : 'Activate';
    confirmAlert({
      title: `${actionName} Account`,
      message: `Are you sure you want to ${actionName.toLowerCase()} ${u.name}'s account?`,
      confirmText: actionName,
      onConfirm: async () => {
        try {
          await apiClient.patch(`/admin/users/${u._id}/status`);
          fetchUsers();
        } catch (err) {
          Alert.alert('Error', err.response?.data?.message || 'Could not update status');
        }
      },
    });
  };

  const renderUserItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.userIdentity}>
          <View style={styles.avatarBox}>
            <Users size={16} color="#60a5fa" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userEmail} numberOfLines={1}>
              {item.email} • {item.phone}
            </Text>
          </View>
        </View>
        <Badge
          variant={item.isActive ? 'success' : 'default'}
          label={item.isActive ? 'ACTIVE' : 'DEACTIVATED'}
        />
      </View>

      <View style={styles.detailsRow}>
        <View style={styles.detailCol}>
          <View style={styles.detailColHeader}>
            <Car size={11} color="#64748b" />
            <Text style={styles.detailLabel}>Plate</Text>
          </View>
          <Text style={styles.plateText}>{item.vehicleNumber || 'None'}</Text>
        </View>

        <View style={styles.detailCol}>
          <View style={styles.detailColHeader}>
            <Wallet size={11} color="#64748b" />
            <Text style={styles.detailLabel}>Wallet</Text>
          </View>
          <Text style={styles.walletText}>₹{item.walletBalance || 0}</Text>
        </View>

        <View style={styles.detailCol}>
          <View style={styles.detailColHeader}>
            <Shield size={11} color="#64748b" />
            <Text style={styles.detailLabel}>Role</Text>
          </View>
          <Text style={styles.roleText}>{item.role.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        <View style={styles.dateRow}>
          <Clock size={11} color="#64748b" />
          <Text style={styles.dateText}>
            Joined {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>

        <View style={styles.actionBtns}>
          <TouchableOpacity
            style={[styles.toggleBtn, item.isActive ? styles.toggleBtnDeact : styles.toggleBtnAct]}
            onPress={() => handleToggleStatus(item)}
            activeOpacity={0.8}
          >
            {item.isActive ? (
              <XCircle size={12} color="#f87171" />
            ) : (
              <UserCheck size={12} color="#34d399" />
            )}
            <Text style={[styles.toggleBtnText, item.isActive ? styles.textDeact : styles.textAct]}>
              {item.isActive ? 'Deactivate' : 'Activate'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDeleteUser(item)}
            disabled={deletingId === item._id}
            activeOpacity={0.8}
          >
            {deletingId === item._id ? (
              <ActivityIndicator size="small" color="#f87171" />
            ) : (
              <Trash2 size={12} color="#f87171" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header & Search */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.titleRow}>
            <Users size={20} color="#3b82f6" />
            <Text style={styles.title}>User Directory</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{users.length} registered</Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Search size={15} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name, email, phone, plate..."
            placeholderTextColor="#64748b"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading accounts...</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item._id}
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconBox}>
                <Users size={28} color="#64748b" />
              </View>
              <Text style={styles.emptyText}>No users match the search query.</Text>
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
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: -0.3,
  },
  countBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  countText: {
    color: '#60a5fa',
    fontSize: 11,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#f8fafc',
    paddingVertical: 10,
    fontSize: 13,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  avatarBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
  },
  userEmail: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  detailsRow: {
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
  plateText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  walletText: {
    color: '#34d399',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  roleText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  footerRow: {
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
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  toggleBtnDeact: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  toggleBtnAct: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  textDeact: {
    color: '#f87171',
  },
  textAct: {
    color: '#34d399',
  },
  actionBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
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
  emptyText: {
    color: '#64748b',
    fontSize: 13,
  },
});
