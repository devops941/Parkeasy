import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Header } from '../../components/common/Header.js';
import { Card } from '../../components/common/Card.js';
import { Badge } from '../../components/common/Badge.js';
import { Button } from '../../components/common/Button.js';
import { useParkingStore } from '../../store/parkingStore.js';
import { colors, spacing, typography } from '../../utils/theme.js';
import { Compass, MapPin, Search } from '../../components/common/Icons.js';

export const UserSlotsScreen = ({ navigation, route }) => {
  const {
    nearbySites,
    selectedSite,
    siteSlots,
    slotSummary,
    selectedSlot,
    fetchNearbySites,
    fetchSitesWithFilter,
    fetchSiteSlots,
    setSelectedSite,
    setSelectedSlot,
    userLocation,
    isLoading,
  } = useParkingStore();

  const [activeFilter, setActiveFilter] = useState('nearby5'); // 'nearby5' | 'area' | 'all'
  const [areaInput, setAreaInput] = useState('');
  const [postalInput, setPostalInput] = useState('');
  const [siteList, setSiteList] = useState([]);

  // Load initial sites
  useEffect(() => {
    const init = async () => {
      const lat = userLocation?.latitude || 12.9716;
      const lng = userLocation?.longitude || 77.6412;

      // 5 km Nearby filter, fallback to all network sites
      const res = await fetchNearbySites(lat, lng, 10);
      let list = res.sites || [];
      if (list.length === 0) {
        list = await fetchSitesWithFilter({});
      }
      setSiteList(list);

      const targetSiteId = route.params?.siteId || list[0]?._id;
      if (targetSiteId) {
        await fetchSiteSlots(targetSiteId);
      }
    };
    init();
  }, [route.params?.siteId]);

  // Handle filter changes
  const applyFilter = async (filterType) => {
    setActiveFilter(filterType);
    const lat = userLocation?.latitude || 12.9716;
    const lng = userLocation?.longitude || 77.6412;

    if (filterType === 'nearby5') {
      const res = await fetchNearbySites(lat, lng, 5);
      setSiteList(res.sites || []);
      if (res.sites?.length > 0) {
        fetchSiteSlots(res.sites[0]._id);
      }
    } else if (filterType === 'all') {
      const sites = await fetchSitesWithFilter({});
      setSiteList(sites || []);
      if (sites?.length > 0) {
        fetchSiteSlots(sites[0]._id);
      }
    }
  };

  const handleSearchFilter = async () => {
    const sites = await fetchSitesWithFilter({
      area: areaInput.trim() || undefined,
      postalCode: postalInput.trim() || undefined,
    });
    setSiteList(sites || []);
    if (sites?.length > 0) {
      fetchSiteSlots(sites[0]._id);
    }
  };

  const handleSelectSite = async (site) => {
    setSelectedSite(site);
    setSelectedSlot(null);
    await fetchSiteSlots(site._id);
  };

  return (
    <View style={styles.container}>
      <Header
        title="Parking Slots"
        subtitle="Live availability & reservation"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 1. Filter Chips */}
        <View style={styles.chipsRow}>
          <TouchableOpacity
            style={[styles.chip, activeFilter === 'nearby5' && styles.activeChip]}
            onPress={() => applyFilter('nearby5')}
            activeOpacity={0.8}
          >
            <Compass size={13} color={activeFilter === 'nearby5' ? '#ffffff' : '#94a3b8'} />
            <Text
              style={[
                styles.chipText,
                activeFilter === 'nearby5' && styles.activeChipText,
              ]}
            >
              Nearby 5 km
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.chip, activeFilter === 'all' && styles.activeChip]}
            onPress={() => applyFilter('all')}
            activeOpacity={0.8}
          >
            <MapPin size={13} color={activeFilter === 'all' ? '#ffffff' : '#94a3b8'} />
            <Text
              style={[
                styles.chipText,
                activeFilter === 'all' && styles.activeChipText,
              ]}
            >
              All Sites
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.chip, activeFilter === 'search' && styles.activeChip]}
            onPress={() => setActiveFilter('search')}
            activeOpacity={0.8}
          >
            <Search size={13} color={activeFilter === 'search' ? '#ffffff' : '#94a3b8'} />
            <Text
              style={[
                styles.chipText,
                activeFilter === 'search' && styles.activeChipText,
              ]}
            >
              Area / PIN
            </Text>
          </TouchableOpacity>
        </View>

        {/* 2. Custom Area / Postal Search Input Box */}
        {activeFilter === 'search' && (
          <Card style={styles.filterCard}>
            <View style={styles.filterInputsRow}>
              <TextInput
                style={styles.filterInput}
                placeholder="Area (e.g. Indiranagar)"
                placeholderTextColor={colors.textMuted}
                value={areaInput}
                onChangeText={setAreaInput}
              />
              <TextInput
                style={[styles.filterInput, { flex: 0.8 }]}
                placeholder="PIN (560038)"
                placeholderTextColor={colors.textMuted}
                value={postalInput}
                onChangeText={setPostalInput}
                keyboardType="numeric"
              />
              <TouchableOpacity
                style={styles.searchFilterBtn}
                onPress={handleSearchFilter}
              >
                <Text style={styles.searchFilterBtnText}>Go</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* 3. Horizontal Site Selector (Sorted Nearest First) */}
        <Text style={styles.sectionLabel}>Select Parking Site:</Text>
        {siteList.length === 0 ? (
          <Card style={styles.emptySitesCard}>
            <Text style={styles.emptySitesText}>No parking sites found for this filter.</Text>
            <Button
              title="Show All Network Sites"
              variant="outline"
              onPress={() => applyFilter('all')}
              style={{ marginTop: 8 }}
            />
          </Card>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.siteSelectorScroll}
          >
            {siteList.map((site) => {
              const isSelected = selectedSite?._id === site._id;
              return (
                <TouchableOpacity
                  key={site._id}
                  style={[
                    styles.siteCard,
                    isSelected && styles.selectedSiteCard,
                  ]}
                  onPress={() => handleSelectSite(site)}
                >
                  <Text style={styles.siteCardName} numberOfLines={1}>
                    {site.name}
                  </Text>
                  <Text style={styles.siteCardDist}>
                    {site.distanceKm !== undefined ? `${site.distanceKm} km` : site.area} • ₹{site.hourlyRate}/hr
                  </Text>
                  <Badge
                    status={site.freeSlotsCount > 0 ? 'available' : 'occupied'}
                    text={`${site.freeSlotsCount ?? 0} Free`}
                    style={{ marginTop: spacing.xs }}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* 4. Slot Availability Overview */}
        {selectedSite && (
          <Card style={styles.overviewCard}>
            <View style={styles.overviewHeader}>
              <View>
                <Text style={styles.overviewTitle}>{selectedSite.name}</Text>
                <Text style={styles.overviewAddress}>
                  {selectedSite.address}, {selectedSite.area}
                </Text>
              </View>
              <Text style={styles.overviewRate}>₹{selectedSite.hourlyRate}/hr</Text>
            </View>

            {slotSummary && (
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.slotAvailable }]} />
                  <Text style={styles.legendText}>Free ({slotSummary.available})</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.slotReserved }]} />
                  <Text style={styles.legendText}>Reserved ({slotSummary.reserved})</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.slotOccupied }]} />
                  <Text style={styles.legendText}>Parked ({slotSummary.occupied})</Text>
                </View>
              </View>
            )}

            {/* 5. Slot Grid */}
            <Text style={styles.gridHeading}>Choose an available slot:</Text>
            {isLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
            ) : (
              <View style={styles.slotsGrid}>
                {siteSlots.map((slot) => {
                  const isAvailable = slot.status === 'available';
                  const isSelected = selectedSlot?._id === slot._id;

                  let bgColor = colors.slotAvailable;
                  if (slot.status === 'reserved') bgColor = colors.slotReserved;
                  if (slot.status === 'occupied') bgColor = colors.slotOccupied;
                  if (slot.status === 'disabled') bgColor = colors.slotDisabled;

                  return (
                    <TouchableOpacity
                      key={slot._id}
                      disabled={!isAvailable}
                      style={[
                        styles.slotBox,
                        { borderColor: bgColor },
                        isSelected && styles.slotSelected,
                        !isAvailable && styles.slotDisabled,
                      ]}
                      onPress={() => setSelectedSlot(slot)}
                    >
                      <Text
                        style={[
                          styles.slotNumber,
                          isSelected && styles.slotSelectedNumber,
                        ]}
                      >
                        {slot.slotNumber}
                      </Text>
                      <View style={[styles.statusIndicator, { backgroundColor: bgColor }]} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* 6. Booking CTA */}
            <Button
              title={
                selectedSlot
                  ? `Proceed with Slot ${selectedSlot.slotNumber}`
                  : 'Proceed with Auto-Assigned Slot'
              }
              onPress={() => {
                navigation.navigate('BookingConfirm', {
                  site: selectedSite,
                  slot: selectedSlot,
                });
              }}
              style={styles.continueBtn}
            />
          </Card>
        )}
      </ScrollView>
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
  },
  chipsRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  activeChipText: {
    color: '#ffffff',
  },
  filterCard: {
    marginBottom: spacing.md,
  },
  filterInputsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  filterInput: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    height: 40,
    color: colors.text,
    fontSize: 13,
  },
  searchFilterBtn: {
    backgroundColor: colors.primary,
    height: 40,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchFilterBtnText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  siteSelectorScroll: {
    marginBottom: spacing.md,
    maxHeight: 120,
  },
  siteCard: {
    width: 170,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 16,
    padding: spacing.md,
    marginRight: spacing.sm,
  },
  selectedSiteCard: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceLight,
  },
  siteCardName: {
    ...typography.h3,
    fontSize: 15,
    color: colors.text,
  },
  siteCardDist: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  overviewCard: {
    marginBottom: spacing.xl,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  overviewTitle: {
    ...typography.h3,
    color: colors.text,
  },
  overviewAddress: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  overviewRate: {
    ...typography.h3,
    color: colors.primaryLight,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceLight,
    padding: spacing.sm,
    borderRadius: 10,
    marginVertical: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
  },
  gridHeading: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  slotBox: {
    width: 58,
    height: 58,
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotSelected: {
    backgroundColor: colors.primary,
    borderColor: '#ffffff',
  },
  slotDisabled: {
    opacity: 0.35,
  },
  slotNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  slotSelectedNumber: {
    color: '#ffffff',
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
  },
  continueBtn: {
    marginTop: spacing.md,
  },
  emptySitesCard: {
    padding: spacing.md,
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  emptySitesText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 4,
  },
});

