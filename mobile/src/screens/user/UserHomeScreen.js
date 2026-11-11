import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
  Modal,
  TextInput,
  FlatList,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { useParkingStore } from '../../store/parkingStore.js';
import { colors, spacing, typography } from '../../utils/theme.js';
import { Card } from '../../components/common/Card.js';
import { Badge } from '../../components/common/Badge.js';
import { Button } from '../../components/common/Button.js';
import MapView, { Marker } from '../../components/common/MapViewWrapper.js';
import { MapPin, AlertCircle, Crosshair } from '../../components/common/Icons.js';
import { notifyNearbySpot } from '../../utils/notifications.js';
import { playSearchTick, playParkingFoundAlert, cancelAlert } from '../../utils/alertSound.js';
import { useSocketEvent } from '../../hooks/useSocketEvent.js';
import { getSocket } from '../../utils/socket.js';

// Default fallback coordinates (Madurai)
const DEFAULT_COORDS = { latitude: 9.9252, longitude: 78.1198 };

export const UserHomeScreen = ({ navigation }) => {
  const {
    nearbySites,
    userLocation,
    isLocationDenied,
    isAutoSearching,
    fetchNearbySites,
    setUserLocation,
    setLocationDenied,
    startAutoSearch,
    stopAutoSearch,
    setSelectedSite,
    isLoading,
  } = useParkingStore();

  const [nearestSite, setNearestSite] = useState(null);
  const [userAreaName, setUserAreaName] = useState('');
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: DEFAULT_COORDS.latitude,
    longitude: DEFAULT_COORDS.longitude,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  });
  const [isLocating, setIsLocating] = useState(false);
  const timerRef = useRef(null);

  // Reverse geocode coords → city name and set userAreaName
  const resolveAreaName = async (coords) => {
    try {
      const geo = await Location.reverseGeocodeAsync({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      if (geo?.[0]) {
        const p = geo[0];
        const city = p.city || p.district || p.subregion || p.region || '';
        if (city) setUserAreaName(city);
      }
    } catch (_) {}
  };

  // Reverse geocode via Nominatim — works on web without expo-location
  const reverseGeocodeWeb = async (coords) => {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await r.json();
      const city =
        data.address?.city ||
        data.address?.town ||
        data.address?.village ||
        data.address?.county ||
        '';
      return city;
    } catch (_) {
      return '';
    }
  };

  // 1. Request location permissions and get current position
  const requestLocationAndFetch = async () => {
    // On web, use the native browser Geolocation API (more accurate than expo-location on web)
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const coords = {
              latitude: Number(position.coords.latitude.toFixed(6)),
              longitude: Number(position.coords.longitude.toFixed(6)),
            };
            setLocationDenied(false);
            setUserLocation(coords);
            setMapRegion((prev) => ({
              ...prev,
              latitude: coords.latitude,
              longitude: coords.longitude,
            }));
            const city = await reverseGeocodeWeb(coords);
            if (city) setUserAreaName(city);
            const res = await fetchNearbySites(coords.latitude, coords.longitude, 10);
            if (res.sites?.length > 0) setNearestSite(res.sites[0]);
          },
          () => {
            // Browser denied or hardware unavailable — fall back to default; user can fix via "Set Location"
            setUserLocation(DEFAULT_COORDS);
            setMapRegion((prev) => ({
              ...prev,
              latitude: DEFAULT_COORDS.latitude,
              longitude: DEFAULT_COORDS.longitude,
            }));
            fetchNearbySites(DEFAULT_COORDS.latitude, DEFAULT_COORDS.longitude, 10);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
      } else {
        // No geolocation API available
        setUserLocation(DEFAULT_COORDS);
        setMapRegion((prev) => ({
          ...prev,
          latitude: DEFAULT_COORDS.latitude,
          longitude: DEFAULT_COORDS.longitude,
        }));
        fetchNearbySites(DEFAULT_COORDS.latitude, DEFAULT_COORDS.longitude, 10);
      }
      return;
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setLocationDenied(true);
        setUserLocation(DEFAULT_COORDS);
        setUserAreaName('Madurai (default)');
        setMapRegion((prev) => ({
          ...prev,
          latitude: DEFAULT_COORDS.latitude,
          longitude: DEFAULT_COORDS.longitude,
        }));
        const res = await fetchNearbySites(DEFAULT_COORDS.latitude, DEFAULT_COORDS.longitude, 10);
        if (res.sites?.length > 0) setNearestSite(res.sites[0]);
        return;
      }

      setLocationDenied(false);

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });
      const coords = {
        latitude: Number(pos.coords.latitude.toFixed(6)),
        longitude: Number(pos.coords.longitude.toFixed(6)),
      };

      resolveAreaName(coords);

      setUserLocation(coords);
      setMapRegion((prev) => ({
        ...prev,
        latitude: coords.latitude,
        longitude: coords.longitude,
      }));

      const res = await fetchNearbySites(coords.latitude, coords.longitude, 10);
      if (res.sites?.length > 0) setNearestSite(res.sites[0]);
    } catch (e) {
      console.warn('[Location] Failed to get location:', e.message);
      setLocationDenied(true);
      setUserLocation(DEFAULT_COORDS);
      setUserAreaName('Madurai (default)');
      fetchNearbySites(DEFAULT_COORDS.latitude, DEFAULT_COORDS.longitude, 10);
    }
  };

  useEffect(() => {
    requestLocationAndFetch();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopAutoSearch();
    };
  }, []);

  // Update nearest site when nearbySites change
  useEffect(() => {
    if (nearbySites && nearbySites.length > 0) {
      // Keep existing selected site if it's still in the list, else pick first
      const stillExists = nearbySites.find((s) => s._id === nearestSite?._id);
      if (!stillExists) {
        setNearestSite(nearbySites[0]);
      }
    } else {
      setNearestSite(null);
    }
  }, [nearbySites]);

  // Join nearest site's Socket.IO room for live slot updates; leave on change/unmount
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !nearestSite?._id) return;
    const siteId = nearestSite._id;
    socket.emit('join:site', siteId);
    return () => socket.emit('leave:site', siteId);
  }, [nearestSite?._id]);

  // Refresh nearby sites when handler scans entry/exit — slot counts change
  useSocketEvent('site:slots_updated', () => {
    if (userLocation) {
      fetchNearbySites(userLocation.latitude, userLocation.longitude, 10);
    }
  });

  // Handle marker / site selection
  const handleSelectSite = (site) => {
    setNearestSite(site);
    const coords = site.location?.coordinates;
    if (coords && coords.length >= 2) {
      setMapRegion({
        latitude: coords[1],
        longitude: coords[0],
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  };

  // Core search — always appends "India" so Nominatim finds Indian cities reliably
  const searchByName = async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setLocationQuery(trimmed);
    setIsSearchingLocation(true);
    setLocationResults([]);
    try {
      const q = encodeURIComponent(`${trimmed}, India`);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=8&addressdetails=1`,
        { headers: { 'Accept-Language': 'en', 'User-Agent': 'ParkEasyApp/1.0' } }
      );
      const data = await res.json();
      setLocationResults(data);
    } catch (e) {
      console.warn('Location search failed:', e.message);
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const handleSearchLocation = () => searchByName(locationQuery);

  // Apply a search result as the user's location
  const handleSelectSearchResult = async (result) => {
    const coords = {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
    };
    const city =
      result.address?.city ||
      result.address?.town ||
      result.address?.village ||
      result.display_name.split(',')[0];
    const state = result.address?.state || '';
    const areaLabel = state ? `${city}, ${state}` : city;

    setShowLocationSearch(false);
    setLocationQuery('');
    setLocationResults([]);
    setNearestSite(null);
    setUserLocation(coords);
    setUserAreaName(areaLabel);
    setMapRegion({
      latitude: coords.latitude,
      longitude: coords.longitude,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    });

    setIsLocating(true);
    try {
      const res = await fetchNearbySites(coords.latitude, coords.longitude, 10);
      if (res.sites?.length > 0) {
        setNearestSite(res.sites[0]);
      } else {
        Alert.alert(
          'No Parking Found',
          `No parking sites available within 10 km of ${city}. Try a different area.`,
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsLocating(false);
    }
  };

  // Open city search modal (works on all platforms)
  const openLocationSearch = () => {
    setLocationQuery('');
    setLocationResults([]);
    setShowLocationSearch(true);
  };

  // My GPS: snap map to real device GPS (mobile only)
  const handleCenterUserLocation = async () => {
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });
      const coords = {
        latitude: Number(pos.coords.latitude.toFixed(6)),
        longitude: Number(pos.coords.longitude.toFixed(6)),
      };
      setUserLocation(coords);
      setMapRegion({
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      });
      resolveAreaName(coords);
      const res = await fetchNearbySites(coords.latitude, coords.longitude, 10);
      if (res.sites?.length > 0) setNearestSite(res.sites[0]);
    } catch {
      const coords = userLocation || DEFAULT_COORDS;
      setMapRegion({
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      });
      fetchNearbySites(coords.latitude, coords.longitude, 10);
    }
  };

  // Stop auto-search and cancel any alert
  const stopSearch = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    cancelAlert();
    stopAutoSearch();
  };

  // 2. Toggle 10 km Auto-Search (Polls every 30 seconds)
  const toggleAutoSearch = async () => {
    if (isAutoSearching) {
      stopSearch();
      return;
    }

    const coords = userLocation || DEFAULT_COORDS;
    startAutoSearch(null);

    // Initial fetch on start
    const initialRes = await fetchNearbySites(coords.latitude, coords.longitude, 10);
    if (initialRes.sites?.length > 0) {
      setNearestSite(initialRes.sites[0]);
    }

    // Poll every 30 seconds
    const interval = setInterval(async () => {
      // Subtle tick so user knows a scan is happening
      playSearchTick();

      const currentCoords = userLocation || DEFAULT_COORDS;
      const { newlyFoundSite } = await fetchNearbySites(
        currentCoords.latitude,
        currentCoords.longitude,
        10
      );

      if (newlyFoundSite) {
        // Play prominent alert, then auto-stop the search
        playParkingFoundAlert();
        await notifyNearbySpot({
          siteName: newlyFoundSite.name,
          distanceKm: newlyFoundSite.distanceKm,
          freeSlotsCount: newlyFoundSite.freeSlotsCount,
        });
        stopSearch();
      }
    }, 30000);

    timerRef.current = interval;
    startAutoSearch(interval);
  };

  return (
    <View style={styles.container}>
      {/* 1. Map Area */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          region={mapRegion}
          showsUserLocation
          userLocation={userLocation}
          showsMyLocationButton
          telemetryTitle={
            userLocation
              ? `OpenStreetMap • Lat: ${userLocation.latitude.toFixed(4)}, Lng: ${userLocation.longitude.toFixed(4)}`
              : undefined
          }
        >
          {/* Parking Sites Markers */}
          {nearbySites.map((site) => {
            const coords = site.location?.coordinates || [77.6412, 12.9716];
            return (
              <Marker
                key={site._id}
                coordinate={{
                  latitude: coords[1],
                  longitude: coords[0],
                }}
                title={site.name}
                description={`₹${site.hourlyRate}/hr • ${site.freeSlotsCount ?? 0} free`}
                onPress={() => handleSelectSite(site)}
              />
            );
          })}
        </MapView>
      </View>

      {/* Floating Action Controls */}
      <View style={styles.floatingControls}>
        {/* Area pill — tappable on all platforms to search/change city */}
        <TouchableOpacity style={styles.floatingPill} onPress={openLocationSearch} activeOpacity={0.8}>
          <Crosshair size={13} color="#38bdf8" />
          <Text style={styles.floatingPillText} numberOfLines={1}>
            {userAreaName || 'Search City'}
          </Text>
        </TouchableOpacity>
        {/* My GPS — mobile only, snaps to real device location */}
        {Platform.OS !== 'web' && (
          <TouchableOpacity style={styles.floatingPill} onPress={handleCenterUserLocation} activeOpacity={0.8}>
            <Crosshair size={13} color="#38bdf8" />
            <Text style={styles.floatingPillText}>My GPS</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 2. Location Permission Warning Banner (if denied) */}
      {isLocationDenied ? (
        <View style={styles.permissionBanner}>
          <AlertCircle size={14} color="#f59e0b" />
          <Text style={styles.permissionText}>
            Location permission denied. Showing default area.
          </Text>
          <TouchableOpacity onPress={requestLocationAndFetch}>
            <Text style={styles.retryLink}>Enable</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* 3. Top Floating Controls: 10 km Auto-Search Toggle */}
      <View style={styles.topControlContainer}>
        <View style={styles.autoSearchCard}>
          <View style={styles.autoSearchInfo}>
            <Text style={styles.autoSearchTitle}>10 km Auto-Search</Text>
            <Text style={styles.autoSearchSubtitle}>
              {isAutoSearching
                ? 'Active: Alerting when new spots appear...'
                : 'Scans for nearby slots every 30 seconds'}
            </Text>
          </View>
          <Button
            title={isAutoSearching ? 'Stop' : 'Start Auto'}
            variant={isAutoSearching ? 'danger' : 'primary'}
            onPress={toggleAutoSearch}
            style={styles.autoSearchBtn}
          />
        </View>
      </View>

      {/* 4. Nearest Site Bottom Sheet */}
      <View style={styles.bottomSheet}>
        {/* Sites Quick Carousel if multiple sites available */}
        {nearbySites.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.sitesCarousel}
            contentContainerStyle={styles.sitesCarouselContent}
          >
            {nearbySites.map((site) => {
              const isSelected = nearestSite?._id === site._id;
              return (
                <TouchableOpacity
                  key={site._id}
                  style={[styles.siteChip, isSelected && styles.siteChipActive]}
                  onPress={() => handleSelectSite(site)}
                  activeOpacity={0.8}
                >
                  <MapPin size={11} color={isSelected ? '#38bdf8' : '#94a3b8'} />
                  <Text
                    style={[styles.siteChipText, isSelected && styles.siteChipTextActive]}
                    numberOfLines={1}
                  >
                    {site.name} ({site.distanceKm != null ? `${site.distanceKm} km` : 'site'})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {isLoading && !nearestSite ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={colors.primaryLight} />
            <Text style={styles.loadingText}>Searching parking locations...</Text>
          </View>
        ) : nearestSite ? (
          <Card style={styles.sheetCard}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.siteName} numberOfLines={1}>
                    {nearestSite.name}
                  </Text>
                  {nearestSite.distanceKm > 10 && (
                    <Badge variant="default" label="Network Site" style={styles.networkBadge} />
                  )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <MapPin size={12} color="#94a3b8" />
                  <Text style={styles.siteAddress} numberOfLines={1}>
                    {nearestSite.address}, {nearestSite.area}
                  </Text>
                </View>
              </View>
              <Badge
                variant={nearestSite.freeSlotsCount > 0 ? 'success' : 'error'}
                label={`${nearestSite.freeSlotsCount ?? 0} Free`}
              />
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>Distance</Text>
                <Text style={styles.statValue}>
                  {nearestSite.distanceKm !== undefined
                    ? `${nearestSite.distanceKm} km`
                    : 'Nearby'}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>Rate</Text>
                <Text style={styles.statValue}>₹{nearestSite.hourlyRate}/hr</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>Min Charge</Text>
                <Text style={styles.statValue}>₹{nearestSite.minimumCharge}</Text>
              </View>
            </View>

            <View style={styles.bottomCardActions}>
              <Button
                title="View Slots & Book Now"
                onPress={() => {
                  setSelectedSite(nearestSite);
                  navigation.navigate('Slots', { siteId: nearestSite._id });
                }}
                style={styles.bookBtn}
              />
            </View>
          </Card>
        ) : (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Parking Sites Found</Text>
            <Text style={styles.emptySubtitle}>
              Turn on 10 km Auto-Search or browse all available locations in the network.
            </Text>
            <Button
              title="Browse All Areas"
              variant="outline"
              onPress={() => navigation.navigate('Slots', {})}
              style={{ marginTop: spacing.sm }}
            />
          </Card>
        )}
      </View>

      {/* Locating overlay — shown while fetching sites after city selection */}
      {isLocating && (
        <View style={styles.locatingOverlay}>
          <ActivityIndicator size="large" color="#38bdf8" />
          <Text style={styles.locatingText}>
            Finding parking near {userAreaName || 'selected area'}...
          </Text>
        </View>
      )}

      {/* Location Search Modal */}
      <Modal
        visible={showLocationSearch}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLocationSearch(false)}
      >
        <View style={styles.searchModalBackdrop}>
          <View style={styles.searchModalCard}>
            <Text style={styles.searchModalTitle}>Search Your City</Text>
            <View style={styles.searchInputRow}>
              <TextInput
                style={styles.searchModalInput}
                placeholder="e.g. Chennai, Coimbatore..."
                placeholderTextColor="#64748b"
                value={locationQuery}
                onChangeText={setLocationQuery}
                onSubmitEditing={handleSearchLocation}
                autoFocus
                returnKeyType="search"
              />
              <TouchableOpacity style={styles.searchModalBtn} onPress={handleSearchLocation}>
                {isSearchingLocation
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.searchModalBtnText}>Go</Text>}
              </TouchableOpacity>
            </View>

            {/* Results list */}
            {locationResults.length > 0 ? (
              <FlatList
                data={locationResults}
                keyExtractor={(item) => item.place_id.toString()}
                style={styles.resultsList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.searchResultItem}
                    onPress={() => handleSelectSearchResult(item)}
                  >
                    <Text style={styles.searchResultName}>
                      {item.address?.city || item.address?.town || item.address?.village || item.display_name.split(',')[0]}
                    </Text>
                    <Text style={styles.searchResultSub} numberOfLines={1}>
                      {item.display_name}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            ) : !isSearchingLocation && locationQuery.trim().length > 0 ? (
              /* No results message */
              <View style={styles.noResultsBox}>
                <Text style={styles.noResultsText}>No results for "{locationQuery}". Try the full city name.</Text>
              </View>
            ) : (
              /* Quick city picks shown before any search */
              <View>
                <Text style={styles.quickPickLabel}>Popular Cities</Text>
                <View style={styles.quickPickRow}>
                  {['Chennai', 'Coimbatore', 'Madurai', 'Trichy', 'Salem', 'Erode', 'Tirunelveli', 'Vellore'].map((city) => (
                    <TouchableOpacity
                      key={city}
                      style={styles.quickPickChip}
                      onPress={() => searchByName(city)}
                    >
                      <Text style={styles.quickPickText}>{city}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <TouchableOpacity
              onPress={() => setShowLocationSearch(false)}
              style={styles.searchModalCancel}
            >
              <Text style={styles.searchModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
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
  mapContainer: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  floatingControls: {
    position: 'absolute',
    right: 16,
    top: 140,
    gap: 8,
    zIndex: 10,
    alignItems: 'flex-end',
  },
  floatingPill: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },
  floatingPillActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  floatingPillPinned: {
    borderColor: '#f59e0b',
  },
  floatingPillText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },
  floatingPillTextActive: {
    color: '#ffffff',
  },
  floatingPillTextPinned: {
    color: '#f59e0b',
  },
  pinnedStatusBanner: {
    position: 'absolute',
    top: 140,
    left: 16,
    right: 140,
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f59e0b',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  pinnedStatusText: {
    color: '#fef3c7',
    fontSize: 10,
    fontWeight: '600',
    flex: 1,
  },
  pinnedResetBtn: {
    backgroundColor: '#b45309',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pinnedResetText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
  },
  pinningHintBanner: {
    position: 'absolute',
    top: 140,
    left: 16,
    right: 140,
    backgroundColor: 'rgba(12, 74, 110, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#38bdf8',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 10,
  },
  pinningHintText: {
    color: '#e0f2fe',
    fontSize: 10,
    fontWeight: '600',
    flex: 1,
  },
  permissionBanner: {
    position: 'absolute',
    top: 50,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: '#78350f',
    padding: spacing.sm,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  permissionText: {
    color: '#fef3c7',
    fontSize: 12,
    flex: 1,
  },
  retryLink: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
    marginLeft: spacing.sm,
    textDecorationLine: 'underline',
  },
  topControlContainer: {
    position: 'absolute',
    top: 58,
    left: spacing.md,
    right: spacing.md,
    zIndex: 5,
  },
  autoSearchCard: {
    backgroundColor: 'rgba(19, 27, 46, 0.95)',
    borderRadius: 16,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  autoSearchInfo: {
    flex: 1,
  },
  autoSearchTitle: {
    ...typography.h3,
    fontSize: 15,
    color: colors.text,
  },
  autoSearchSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  autoSearchBtn: {
    height: 38,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 20,
    left: spacing.md,
    right: spacing.md,
    zIndex: 5,
  },
  sitesCarousel: {
    marginBottom: 8,
    maxHeight: 40,
  },
  sitesCarouselContent: {
    gap: 8,
  },
  siteChip: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  siteChipActive: {
    backgroundColor: '#1e293b',
    borderColor: '#38bdf8',
  },
  siteChipText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  siteChipTextActive: {
    color: '#38bdf8',
  },
  networkBadge: {
    paddingVertical: 1,
    paddingHorizontal: 6,
  },
  loadingCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 8,
  },
  sheetCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  sheetTitleBox: {
    flex: 1,
    marginRight: spacing.sm,
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
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    marginVertical: spacing.sm,
  },
  statCol: {
    alignItems: 'center',
  },
  statLabel: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
  },
  statValue: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  bottomCardActions: {
    marginTop: spacing.xs,
  },
  bookBtn: {
    flex: 1,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
  },
  emptySubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  locatingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(7, 11, 20, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
  locatingText: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  searchModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  searchModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchModalTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  searchInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  searchModalInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    color: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  searchModalBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchModalBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  resultsList: {
    maxHeight: 240,
    marginBottom: 4,
  },
  searchResultItem: {
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  searchResultName: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '600',
  },
  searchResultSub: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  noResultsBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  noResultsText: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
  },
  quickPickLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 4,
  },
  quickPickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  quickPickChip: {
    backgroundColor: 'rgba(56,189,248,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  quickPickText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '600',
  },
  searchModalCancel: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 8,
  },
  searchModalCancelText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
});
