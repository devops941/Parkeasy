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
import * as Location from 'expo-location';
import MapView, { Marker } from '../../components/common/MapViewWrapper.js';
import { colors, spacing, typography } from '../../utils/theme.js';
import { apiClient } from '../../api/client.js';
import { Card } from '../../components/common/Card.js';
import { Badge } from '../../components/common/Badge.js';
import { Button } from '../../components/common/Button.js';
import { Plus, Grid, Edit3, Trash2, MapPin, Crosshair, Navigation } from '../../components/common/Icons.js';

export const AdminSitesScreen = () => {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add/Edit Site Modal
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [siteForm, setSiteForm] = useState({
    name: '',
    address: '',
    area: '',
    postalCode: '',
    hourlyRate: '40',
    minimumCharge: '40',
    totalSlots: '10',
    latitude: 12.9716,
    longitude: 77.6412,
  });
  const [submittingSite, setSubmittingSite] = useState(false);
  const [fetchingLiveLocation, setFetchingLiveLocation] = useState(false);

  // Inline delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Slots Management Modal
  const [showSlotsModal, setShowSlotsModal] = useState(false);
  const [selectedSiteForSlots, setSelectedSiteForSlots] = useState(null);
  const [siteSlots, setSiteSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [newSlotNumber, setNewSlotNumber] = useState('');
  const [addingSlot, setAddingSlot] = useState(false);

  const fetchSites = useCallback(async () => {
    try {
      const res = await apiClient.get('/admin/sites', { params: { limit: 50, isActive: 'true' } });
      setSites(res.data?.data?.sites || []);
    } catch (err) {
      console.warn('Failed to load sites:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSites();
  };

  const openCreateModal = () => {
    setEditingSite(null);
    setSiteForm({
      name: '',
      address: '',
      area: '',
      postalCode: '',
      hourlyRate: '40',
      minimumCharge: '40',
      totalSlots: '10',
      latitude: 12.9716,
      longitude: 77.6412,
    });
    setShowSiteModal(true);
  };

  const openEditModal = (site) => {
    setEditingSite(site);
    const coords = site.location?.coordinates || [77.6412, 12.9716];
    setSiteForm({
      name: site.name,
      address: site.address,
      area: site.area,
      postalCode: site.postalCode,
      hourlyRate: String(site.hourlyRate),
      minimumCharge: String(site.minimumCharge),
      totalSlots: String(site.totalSlots || 0),
      longitude: coords[0],
      latitude: coords[1],
    });
    setShowSiteModal(true);
  };

  const handleFetchLiveLocation = async () => {
    setFetchingLiveLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please grant location permissions in your browser or device settings to fetch live GPS.'
        );
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const lat = Number(pos.coords.latitude.toFixed(6));
      const lng = Number(pos.coords.longitude.toFixed(6));

      // Attempt reverse geocoding to auto-fill address & area
      let autoAddress = '';
      let autoArea = '';
      let autoPostal = '';

      try {
        const geocoded = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (geocoded && geocoded.length > 0) {
          const place = geocoded[0];
          autoAddress = [place.streetNumber, place.street, place.name].filter(Boolean).join(' ');
          autoArea = place.district || place.subregion || place.city || '';
          autoPostal = place.postalCode || '';
        }
      } catch (e) {
        console.warn('Geocoding notice:', e.message);
      }

      setSiteForm((prev) => ({
        ...prev,
        latitude: lat,
        longitude: lng,
        address: prev.address || autoAddress || `${lat}, ${lng}`,
        area: prev.area || autoArea || 'Central District',
        postalCode: prev.postalCode || autoPostal || '560001',
      }));

      Alert.alert(
        'GPS Locked!',
        `Live Coordinates: ${lat}, ${lng}${autoArea ? `\nDetected Area: ${autoArea}` : ''}`
      );
    } catch (err) {
      Alert.alert('GPS Error', err.message || 'Could not fetch device location');
    } finally {
      setFetchingLiveLocation(false);
    }
  };

  const handleSaveSite = async () => {
    if (!siteForm.name.trim() || !siteForm.address.trim() || !siteForm.area.trim()) {
      Alert.alert('Required Fields', 'Please fill in site name, address, and area');
      return;
    }

    setSubmittingSite(true);
    try {
      const lat = Number(siteForm.latitude) || 12.9716;
      const lng = Number(siteForm.longitude) || 77.6412;
      const slots = Number(siteForm.totalSlots) || 10;

      const payload = {
        name: siteForm.name.trim(),
        address: siteForm.address.trim(),
        area: siteForm.area.trim(),
        postalCode: siteForm.postalCode.trim() || '560001',
        hourlyRate: Number(siteForm.hourlyRate) || 40,
        minimumCharge: Number(siteForm.minimumCharge) || 20,
        latitude: lat,
        longitude: lng,
        totalSlots: slots,
        location: {
          type: 'Point',
          coordinates: [lng, lat], // [lng, lat]
        },
      };

      if (editingSite) {
        await apiClient.put(`/admin/sites/${editingSite._id}`, payload);
        Alert.alert('Success', 'Parking site updated successfully');
      } else {
        await apiClient.post('/admin/sites', payload);
        Alert.alert('Success', `Site created with ${slots} slots!`);
      }

      setShowSiteModal(false);
      fetchSites();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save parking site');
    } finally {
      setSubmittingSite(false);
    }
  };

  const handleDeleteSite = async (site) => {
    if (confirmDeleteId !== site._id) {
      setConfirmDeleteId(site._id);
      return;
    }
    setConfirmDeleteId(null);
    setDeletingId(site._id);
    try {
      await apiClient.delete(`/admin/sites/${site._id}`);
      setSites((prev) => prev.filter((s) => s._id !== site._id));
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to delete site');
    } finally {
      setDeletingId(null);
    }
  };

  // Manage Slots
  const openSlotsModal = async (site) => {
    setSelectedSiteForSlots(site);
    setShowSlotsModal(true);
    fetchSlotsForSite(site._id);
  };

  const fetchSlotsForSite = async (siteId) => {
    setLoadingSlots(true);
    try {
      const res = await apiClient.get(`/admin/sites/${siteId}/slots`);
      const slots = res.data?.data?.slots || [];
      setSiteSlots(slots);
      setNewSlotNumber(`S-${String(slots.length + 1).padStart(2, '0')}`);
    } catch (err) {
      console.warn('Failed to load slots:', err.message);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleAddSlot = async () => {
    if (!newSlotNumber.trim()) return;
    setAddingSlot(true);
    try {
      await apiClient.post(`/admin/sites/${selectedSiteForSlots._id}/slots`, {
        slotNumber: newSlotNumber.trim().toUpperCase(),
      });
      fetchSlotsForSite(selectedSiteForSlots._id);
      fetchSites();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to add slot');
    } finally {
      setAddingSlot(false);
    }
  };

  const handleToggleSlotStatus = async (slot) => {
    const nextStatus = slot.status === 'disabled' ? 'available' : 'disabled';
    try {
      await apiClient.put(`/admin/slots/${slot._id}`, { status: nextStatus });
      fetchSlotsForSite(selectedSiteForSlots._id);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not update slot');
    }
  };

  const handleDeleteSlot = async (slot) => {
    Alert.alert('Delete Slot', `Delete slot "${slot.slotNumber}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/admin/slots/${slot._id}`);
            fetchSlotsForSite(selectedSiteForSlots._id);
            fetchSites();
          } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Cannot delete slot');
          }
        },
      },
    ]);
  };

  const renderSiteItem = ({ item }) => (
    <Card style={styles.siteCard}>
      <View style={styles.siteHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.siteName}>{item.name}</Text>
          <Text style={styles.siteAddress}>{item.address}, {item.area} ({item.postalCode})</Text>
          <View style={styles.siteGpsTag}>
            <MapPin size={11} color="#38bdf8" />
            <Text style={styles.siteGpsTagText}>
              GPS: {(item.location?.coordinates?.[1] ?? item.latitude ?? 0).toFixed(4)}, {(item.location?.coordinates?.[0] ?? item.longitude ?? 0).toFixed(4)}
            </Text>
          </View>
        </View>
        <Badge variant={item.isActive ? 'success' : 'default'} label={item.isActive ? 'ACTIVE' : 'INACTIVE'} />
      </View>

      <View style={styles.siteStatsRow}>
        <View style={styles.miniStat}>
          <Text style={styles.miniStatLabel}>Rate</Text>
          <Text style={styles.miniStatVal}>₹{item.hourlyRate}/hr</Text>
        </View>
        <View style={styles.miniStat}>
          <Text style={styles.miniStatLabel}>Min Fee</Text>
          <Text style={styles.miniStatVal}>₹{item.minimumCharge}</Text>
        </View>
        <View style={styles.miniStat}>
          <Text style={styles.miniStatLabel}>Total Slots</Text>
          <Text style={[styles.miniStatVal, { color: colors.primaryLight }]}>{item.totalSlots || 0}</Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtnSlots} onPress={() => openSlotsModal(item)}>
          <Grid size={13} color="#60a5fa" style={{ marginRight: 5 }} />
          <Text style={styles.actionBtnSlotsText}>Slots Grid</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtnEdit} onPress={() => openEditModal(item)}>
          <Edit3 size={13} color="#94a3b8" style={{ marginRight: 4 }} />
          <Text style={styles.actionBtnEditText}>Edit</Text>
        </TouchableOpacity>
        {confirmDeleteId === item._id ? (
          <View style={styles.confirmDeleteRow}>
            <Text style={styles.confirmDeleteLabel}>Sure?</Text>
            <TouchableOpacity
              style={styles.confirmYesBtn}
              onPress={() => handleDeleteSite(item)}
              disabled={deletingId === item._id}
            >
              {deletingId === item._id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.confirmYesText}>Yes</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmNoBtn}
              onPress={() => setConfirmDeleteId(null)}
            >
              <Text style={styles.confirmNoText}>No</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.actionBtnDelete}
            onPress={() => handleDeleteSite(item)}
            disabled={deletingId === item._id}
          >
            <Trash2 size={13} color="#fca5a5" style={{ marginRight: 4 }} />
            <Text style={styles.actionBtnDeleteText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Parking Sites Management</Text>
          <Text style={styles.subtitle}>{sites.length} sites active in network</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openCreateModal}>
          <Plus size={14} color="#ffffff" style={{ marginRight: 4 }} />
          <Text style={styles.addBtnText}>Add Site</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.primaryLight} />
          <Text style={styles.loadingText}>Loading parking sites...</Text>
        </View>
      ) : (
        <FlatList
          data={sites}
          keyExtractor={(item) => item._id}
          renderItem={renderSiteItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryLight} />}
        />
      )}

      {/* CREATE / EDIT SITE MODAL WITH MAP PIN PICKER */}
      <Modal visible={showSiteModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCardLarge}>
            <Text style={styles.modalTitle}>{editingSite ? 'Edit Parking Site' : 'New Parking Site'}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.formLabel}>Site Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Downtown Mall Station"
                placeholderTextColor={colors.textMuted}
                value={siteForm.name}
                onChangeText={(v) => setSiteForm({ ...siteForm, name: v })}
              />

              <Text style={styles.formLabel}>Street Address *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 45 Grand Avenue"
                placeholderTextColor={colors.textMuted}
                value={siteForm.address}
                onChangeText={(v) => setSiteForm({ ...siteForm, address: v })}
              />

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.formLabel}>Area / Locality *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Indiranagar"
                    placeholderTextColor={colors.textMuted}
                    value={siteForm.area}
                    onChangeText={(v) => setSiteForm({ ...siteForm, area: v })}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.formLabel}>Postal PIN *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="560038"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    value={siteForm.postalCode}
                    onChangeText={(v) => setSiteForm({ ...siteForm, postalCode: v })}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.formLabel}>Hourly Rate (₹) *</Text>
                  <TextInput
                    style={styles.formInput}
                    keyboardType="number-pad"
                    value={siteForm.hourlyRate}
                    onChangeText={(v) => setSiteForm({ ...siteForm, hourlyRate: v })}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.formLabel}>Min Charge (₹) *</Text>
                  <TextInput
                    style={styles.formInput}
                    keyboardType="number-pad"
                    value={siteForm.minimumCharge}
                    onChangeText={(v) => setSiteForm({ ...siteForm, minimumCharge: v })}
                  />
                </View>
              </View>

              {!editingSite && (
                <View>
                  <Text style={styles.formLabel}>Auto-Generate Slots Count</Text>
                  <TextInput
                    style={styles.formInput}
                    keyboardType="number-pad"
                    value={siteForm.totalSlots}
                    onChangeText={(v) => setSiteForm({ ...siteForm, totalSlots: v })}
                  />
                </View>
              )}

              {/* GPS & LIVE LOCATION SECTION */}
              <View style={styles.gpsSectionCard}>
                <View style={styles.gpsSectionHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.gpsSectionTitle}>Site Coordinates & GPS Pin</Text>
                    <Text style={styles.gpsSectionSub}>Auto-fetch live GPS or enter coordinates</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.liveLocationBtn}
                    onPress={handleFetchLiveLocation}
                    disabled={fetchingLiveLocation}
                    activeOpacity={0.8}
                  >
                    {fetchingLiveLocation ? (
                      <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 6 }} />
                    ) : (
                      <Crosshair size={13} color="#ffffff" style={{ marginRight: 6 }} />
                    )}
                    <Text style={styles.liveLocationBtnText}>
                      {fetchingLiveLocation ? 'Locating...' : 'Fetch Live GPS'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Coordinate Inputs */}
                <View style={styles.formRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.coordsInputLabel}>Latitude</Text>
                    <TextInput
                      style={styles.coordsInput}
                      value={String(siteForm.latitude)}
                      onChangeText={(v) => {
                        const parsed = parseFloat(v);
                        setSiteForm((prev) => ({ ...prev, latitude: isNaN(parsed) ? v : parsed }));
                      }}
                      keyboardType="numeric"
                      placeholder="12.9716"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.coordsInputLabel}>Longitude</Text>
                    <TextInput
                      style={styles.coordsInput}
                      value={String(siteForm.longitude)}
                      onChangeText={(v) => {
                        const parsed = parseFloat(v);
                        setSiteForm((prev) => ({ ...prev, longitude: isNaN(parsed) ? v : parsed }));
                      }}
                      keyboardType="numeric"
                      placeholder="77.6412"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>
              </View>

              {/* MAP PIN PICKER */}
              <Text style={styles.formLabel}>Interactive Map Pin (Click to reposition pin)</Text>
              <View style={styles.mapContainer}>
                <MapView
                  style={StyleSheet.absoluteFillObject}
                  region={{
                    latitude: Number(siteForm.latitude) || 12.9716,
                    longitude: Number(siteForm.longitude) || 77.6412,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                  }}
                  onPress={(e) => {
                    const { latitude, longitude } = e.nativeEvent.coordinate;
                    setSiteForm((prev) => ({
                      ...prev,
                      latitude: Number(latitude.toFixed(6)),
                      longitude: Number(longitude.toFixed(6)),
                    }));
                  }}
                >
                  <Marker
                    coordinate={{
                      latitude: Number(siteForm.latitude) || 12.9716,
                      longitude: Number(siteForm.longitude) || 77.6412,
                    }}
                    title={siteForm.name || 'Site Location'}
                    description={`${Number(siteForm.latitude || 0).toFixed(4)}, ${Number(siteForm.longitude || 0).toFixed(4)}`}
                  />
                </MapView>
              </View>

              <View style={styles.coordsBadgeRow}>
                <MapPin size={12} color="#38bdf8" />
                <Text style={styles.coordsText}>
                  Coordinates: {Number(siteForm.latitude || 0).toFixed(5)}, {Number(siteForm.longitude || 0).toFixed(5)}
                </Text>
              </View>

              <View style={styles.modalBtns}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setShowSiteModal(false)}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button
                  title={editingSite ? 'Update Site' : 'Create Site & Slots'}
                  onPress={handleSaveSite}
                  loading={submittingSite}
                  style={{ flex: 1, marginLeft: 8 }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MANAGE SLOTS GRID MODAL */}
      <Modal visible={showSlotsModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCardLarge}>
            <View style={styles.slotsModalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedSiteForSlots?.name}</Text>
                <Text style={styles.subtitle}>Slots Grid & Status Management</Text>
              </View>
              <TouchableOpacity onPress={() => setShowSlotsModal(false)}>
                <Text style={styles.closeModalText}>✕ Close</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Add Slot Bar */}
            <View style={styles.addSlotBar}>
              <TextInput
                style={styles.slotInput}
                placeholder="Slot # (e.g. A-11)"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                value={newSlotNumber}
                onChangeText={setNewSlotNumber}
              />
              <Button
                title="+ Add Slot"
                onPress={handleAddSlot}
                loading={addingSlot}
                style={styles.addSlotBtn}
              />
            </View>

            {/* Slot Grid View */}
            {loadingSlots ? (
              <ActivityIndicator color={colors.primaryLight} style={{ marginVertical: 30 }} />
            ) : (
              <ScrollView style={{ maxHeight: 380 }}>
                <View style={styles.slotGrid}>
                  {siteSlots.map((slot) => {
                    const isAvail = slot.status === 'available';
                    const isOcc = slot.status === 'occupied';
                    const isRes = slot.status === 'reserved';
                    const isDis = slot.status === 'disabled';

                    return (
                      <View key={slot._id} style={styles.slotCellWrapper}>
                        <TouchableOpacity
                          style={[
                            styles.slotCell,
                            isAvail && styles.slotCellAvail,
                            isOcc && styles.slotCellOcc,
                            isRes && styles.slotCellRes,
                            isDis && styles.slotCellDis,
                          ]}
                          onPress={() => handleToggleSlotStatus(slot)}
                          onLongPress={() => handleDeleteSlot(slot)}
                        >
                          <Text style={styles.slotCellNum}>{slot.slotNumber}</Text>
                          <Text style={styles.slotCellStatus}>{slot.status.toUpperCase()}</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
                <Text style={styles.slotHint}>
                  Tap a slot to toggle Disabled/Available. Long press to Delete slot.
                </Text>
              </ScrollView>
            )}
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
  siteCard: {
    marginBottom: 12,
  },
  siteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  siteName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  siteAddress: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },
  siteStatsRow: {
    flexDirection: 'row',
    marginVertical: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.surfaceLight,
  },
  miniStat: {
    flex: 1,
  },
  miniStatLabel: {
    color: colors.textMuted,
    fontSize: 11,
  },
  miniStatVal: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionBtnSlots: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: colors.surfaceLight,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnSlotsText: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '700',
  },
  actionBtnEdit: {
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
  actionBtnEditText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  actionBtnDelete: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: '#7f1d1d',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnDeleteText: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '600',
  },
  confirmDeleteRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  confirmDeleteLabel: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '700',
  },
  confirmYesBtn: {
    backgroundColor: '#dc2626',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 7,
    minWidth: 36,
    alignItems: 'center',
  },
  confirmYesText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  confirmNoBtn: {
    backgroundColor: '#1e293b',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 7,
  },
  confirmNoText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalCardLarge: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: '90%',
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
    marginTop: 6,
  },
  formInput: {
    backgroundColor: colors.surfaceLight,
    color: colors.text,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  formRow: {
    flexDirection: 'row',
  },
  mapContainer: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: 8,
  },
  coordsText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  coordsBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0f172a',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    marginBottom: 12,
  },
  siteGpsTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  siteGpsTagText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  gpsSectionCard: {
    backgroundColor: '#0c1322',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    marginVertical: 10,
  },
  gpsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  gpsSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
  },
  gpsSectionSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  liveLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  liveLocationBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  coordsInputLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  coordsInput: {
    backgroundColor: colors.surfaceLight,
    color: colors.text,
    borderRadius: 8,
    padding: 8,
    fontSize: 13,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalBtns: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 20,
  },
  slotsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  closeModalText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  addSlotBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  slotInput: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    color: colors.text,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addSlotBtn: {
    paddingHorizontal: 16,
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotCellWrapper: {
    width: '31%',
  },
  slotCell: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  slotCellAvail: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: colors.success,
  },
  slotCellOcc: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: colors.error,
  },
  slotCellRes: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: colors.warning,
  },
  slotCellDis: {
    backgroundColor: 'rgba(71, 85, 105, 0.25)',
    borderColor: '#475569',
  },
  slotCellNum: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  slotCellStatus: {
    color: colors.textMuted,
    fontSize: 9,
    marginTop: 2,
    fontWeight: '600',
  },
  slotHint: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
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

