import { create } from 'zustand';
import { apiClient } from '../api/client.js';

// Haversine distance calculator in kilometers
const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

export const useParkingStore = create((set, get) => ({
  nearbySites: [],
  filteredSites: [],
  selectedSite: null,
  siteSlots: [],
  slotSummary: null,
  selectedSlot: null,
  userLocation: null,
  isLocationDenied: false,
  isAutoSearching: false,
  autoSearchIntervalId: null,
  knownSiteIds: new Set(),
  isLoading: false,
  error: null,

  setUserLocation: (coords) => set({ userLocation: coords, isLocationDenied: false }),
  setLocationDenied: (denied) => set({ isLocationDenied: denied }),

  /**
   * Fetch nearby sites using $geoNear with automatic network fallback
   */
  fetchNearbySites: async (lat, lng, radius = 10) => {
    try {
      set({ isLoading: true, error: null });
      const res = await apiClient.get('/parking/sites/nearby', {
        params: { lat, lng, radius },
      });
      const sites = res.data.data.sites || [];

      // Check if new site was discovered (for auto-search notifications)
      const currentKnown = new Set(get().knownSiteIds);
      let newlyFoundSite = null;

      for (const site of sites) {
        if (!currentKnown.has(site._id)) {
          newlyFoundSite = site;
          currentKnown.add(site._id);
        }
      }

      set({
        nearbySites: sites,
        knownSiteIds: currentKnown,
        isLoading: false,
      });

      return { sites, newlyFoundSite };
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to fetch nearby sites';
      set({ isLoading: false, error: msg });
      return { sites: [], newlyFoundSite: null };
    }
  },

  /**
   * Filter sites by Area or Postal Code or All
   */
  fetchSitesWithFilter: async ({ area, postalCode, search } = {}) => {
    try {
      set({ isLoading: true, error: null });
      const userLoc = get().userLocation;
      const res = await apiClient.get('/parking/sites', {
        params: { area, postalCode, search, limit: 50 },
      });
      let sites = res.data.data.sites || [];

      // Calculate distance for all sites if user coordinates are known
      if (userLoc?.latitude && userLoc?.longitude) {
        sites = sites.map((site) => {
          const coords = site.location?.coordinates || [77.6412, 12.9716];
          const dist = calculateDistanceKm(userLoc.latitude, userLoc.longitude, coords[1], coords[0]);
          return {
            ...site,
            distanceKm: dist,
            distanceMeters: Math.round(dist * 1000),
          };
        }).sort((a, b) => a.distanceKm - b.distanceKm);
      }

      set({ filteredSites: sites, isLoading: false });
      return sites;
    } catch (err) {
      set({ isLoading: false, error: err.message });
      return [];
    }
  },

  /**
   * Fetch slots with real-time availability for a specific site
   */
  fetchSiteSlots: async (siteId) => {
    try {
      set({ isLoading: true, error: null });
      const res = await apiClient.get(`/parking/sites/${siteId}/slots`);
      const { site, slots, summary } = res.data.data;
      set({
        selectedSite: site,
        siteSlots: slots,
        slotSummary: summary,
        isLoading: false,
      });
      return { site, slots, summary };
    } catch (err) {
      set({ isLoading: false, error: err.message });
      return null;
    }
  },

  setSelectedSlot: (slot) => set({ selectedSlot: slot }),
  setSelectedSite: (site) => set({ selectedSite: site }),

  /**
   * Auto-Search 10 km Polling Toggle
   */
  startAutoSearch: (intervalId) => {
    set({ isAutoSearching: true, autoSearchIntervalId: intervalId });
  },

  stopAutoSearch: () => {
    const id = get().autoSearchIntervalId;
    if (id) {
      clearInterval(id);
    }
    set({ isAutoSearching: false, autoSearchIntervalId: null });
  },
}));
