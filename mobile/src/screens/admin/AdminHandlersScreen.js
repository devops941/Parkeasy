import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../utils/theme.js';
import { apiClient } from '../../api/client.js';
import { Card } from '../../components/common/Card.js';
import { Badge } from '../../components/common/Badge.js';
import { Button } from '../../components/common/Button.js';
import { Plus, Edit3, Trash2, HardHat, AlertCircle } from '../../components/common/Icons.js';

export const AdminHandlersScreen = () => {
  const [handlers, setHandlers] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingHandler, setEditingHandler] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    assignedSite: null,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [hRes, sRes] = await Promise.all([
        apiClient.get('/admin/handlers', { params: { limit: 50 } }),
        apiClient.get('/admin/sites', { params: { limit: 50 } }),
      ]);
      setHandlers(hRes.data?.data?.handlers || []);
      setSites(sRes.data?.data?.sites || []);
    } catch (err) {
      console.warn('Failed to load handlers:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const openCreateModal = () => {
    setEditingHandler(null);
    setForm({
      name: '',
      email: '',
      phone: '',
      password: '',
      assignedSite: sites.length > 0 ? sites[0]._id : null,
    });
    setShowModal(true);
  };

  const openEditModal = (h) => {
    setEditingHandler(h);
    setForm({
      name: h.name,
      email: h.email,
      phone: h.phone,
      password: '',
      assignedSite: h.assignedSite?._id || h.assignedSite || null,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      Alert.alert('Required Fields', 'Name, email, and phone number are required');
      return;
    }

    if (!editingHandler && (!form.password || form.password.length < 6)) {
      Alert.alert('Password Required', 'Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    try {
      if (editingHandler) {
        await apiClient.put(`/admin/handlers/${editingHandler._id}`, {
          name: form.name.trim(),
          phone: form.phone.trim(),
          assignedSite: form.assignedSite,
          password: form.password ? form.password : undefined,
        });
        Alert.alert('Success', 'Handler details updated successfully');
      } else {
        await apiClient.post('/admin/handlers', {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          password: form.password,
          assignedSite: form.assignedSite,
        });
        Alert.alert('Success', 'New station handler created!');
      }

      setShowModal(false);
      fetchData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save handler');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (h) => {
    Alert.alert('Delete Handler', `Remove handler "${h.name}" from station?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/admin/handlers/${h._id}`);
            fetchData();
          } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to delete');
          }
        },
      },
    ]);
  };

  const renderHandlerItem = ({ item }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.handlerName}>{item.name}</Text>
          <Text style={styles.handlerEmail}>{item.email} • {item.phone}</Text>
        </View>
        <Badge variant={item.isActive ? 'success' : 'default'} label={item.isActive ? 'ACTIVE' : 'DISABLED'} />
      </View>

      <View style={styles.assignedBox}>
        <Text style={styles.assignedLabel}>Assigned Parking Station:</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
          {!item.assignedSite && <AlertCircle size={13} color="#fbbf24" style={{ marginRight: 4 }} />}
          <Text style={[styles.assignedSiteName, !item.assignedSite && { color: '#fbbf24' }]}>
            {item.assignedSite?.name || 'Unassigned (Booth Inactive)'}
          </Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
          <Edit3 size={13} color="#94a3b8" style={{ marginRight: 4 }} />
          <Text style={styles.editBtnText}>Edit / Assign</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)}>
          <Trash2 size={13} color="#fca5a5" style={{ marginRight: 4 }} />
          <Text style={styles.delBtnText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Station Handlers</Text>
          <Text style={styles.subtitle}>{handlers.length} personnel registered</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openCreateModal}>
          <Plus size={14} color="#ffffff" style={{ marginRight: 4 }} />
          <Text style={styles.addBtnText}>Add Handler</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.primaryLight} />
          <Text style={styles.loadingText}>Loading handlers...</Text>
        </View>
      ) : (
        <FlatList
          data={handlers}
          keyExtractor={(item) => item._id}
          renderItem={renderHandlerItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryLight} />}
        />
      )}

      {/* CREATE / EDIT HANDLER MODAL */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingHandler ? 'Update Handler' : 'Register New Handler'}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.formLabel}>Full Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Ramesh Kumar"
                placeholderTextColor={colors.textMuted}
                value={form.name}
                onChangeText={(v) => setForm({ ...form, name: v })}
              />

              {!editingHandler && (
                <>
                  <Text style={styles.formLabel}>Email Address *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="handler@parkeasy.com"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={form.email}
                    onChangeText={(v) => setForm({ ...form, email: v })}
                  />
                </>
              )}

              <Text style={styles.formLabel}>Phone Number *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="9876543210"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={form.phone}
                onChangeText={(v) => setForm({ ...form, phone: v })}
              />

              <Text style={styles.formLabel}>
                {editingHandler ? 'Change Password (Leave blank to keep)' : 'Initial Password *'}
              </Text>
              <TextInput
                style={styles.formInput}
                placeholder="Min 6 characters"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={form.password}
                onChangeText={(v) => setForm({ ...form, password: v })}
              />

              {/* SITE SELECTION */}
              <Text style={styles.formLabel}>Assign to Parking Station *</Text>
              <View style={styles.sitesList}>
                {sites.map((s) => (
                  <TouchableOpacity
                    key={s._id}
                    style={[
                      styles.siteChip,
                      form.assignedSite === s._id && styles.siteChipActive,
                    ]}
                    onPress={() => setForm({ ...form, assignedSite: s._id })}
                  >
                    <Text
                      style={[
                        styles.siteChipText,
                        form.assignedSite === s._id && styles.siteChipTextActive,
                      ]}
                    >
                      {s.name} ({s.area})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalBtns}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setShowModal(false)}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button
                  title={editingHandler ? 'Save Changes' : 'Create Handler'}
                  onPress={handleSave}
                  loading={submitting}
                  style={{ flex: 1, marginLeft: 8 }}
                />
              </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    fontSize: 12,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 40,
  },
  card: {
    marginBottom: 10,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  handlerName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  handlerEmail: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  assignedBox: {
    backgroundColor: colors.surfaceLight,
    padding: 10,
    borderRadius: 8,
    marginVertical: 10,
  },
  assignedLabel: {
    color: colors.textMuted,
    fontSize: 11,
  },
  assignedSiteName: {
    color: colors.primaryLight,
    fontSize: 14,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: colors.surfaceLight,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  editBtnText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  delBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: '#7f1d1d',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  delBtnText: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: '85%',
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: 12,
  },
  formLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 8,
  },
  formInput: {
    backgroundColor: colors.surfaceLight,
    color: colors.text,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 6,
  },
  sitesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 6,
  },
  siteChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  siteChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  siteChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  siteChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  modalBtns: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 20,
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
});

