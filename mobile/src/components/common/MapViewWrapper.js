import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Platform } from 'react-native';
import { colors } from '../../utils/theme.js';
import { MapPin, Compass, Plus } from './Icons.js';

// Web Mercator projection calculations
const TILE_SIZE = 256;

const latLngToWorldPixel = (lat, lng, zoom) => {
  const scale = TILE_SIZE * Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * scale;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const clampedSin = Math.max(-0.9999, Math.min(0.9999, sinLat));
  const y = (0.5 - Math.log((1 + clampedSin) / (1 - clampedSin)) / (4 * Math.PI)) * scale;
  return { x, y };
};

const worldPixelToLatLng = (worldX, worldY, zoom) => {
  const scale = TILE_SIZE * Math.pow(2, zoom);
  const lng = (worldX / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * worldY) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return {
    latitude: Number(lat.toFixed(6)),
    longitude: Number(lng.toFixed(6)),
  };
};

const MapContext = createContext(null);

export const Marker = ({
  coordinate = { latitude: 12.9716, longitude: 77.6412 },
  title,
  description,
  children,
  onPress,
  draggable,
  onDragEnd,
  pinColor,
}) => {
  const mapCtx = useContext(MapContext);

  if (!mapCtx) return null;

  const { centerLat, centerLng, zoom, width, height } = mapCtx;
  const markerLat = coordinate?.latitude ?? centerLat;
  const markerLng = coordinate?.longitude ?? centerLng;

  const centerWorld = latLngToWorldPixel(centerLat, centerLng, zoom);
  const markerWorld = latLngToWorldPixel(markerLat, markerLng, zoom);

  const screenX = markerWorld.x - centerWorld.x + width / 2;
  const screenY = markerWorld.y - centerWorld.y + height / 2;

  // If marker is outside visible viewport margin, hide or clamp
  const isVisible =
    screenX >= -60 && screenX <= width + 60 && screenY >= -60 && screenY <= height + 60;

  if (!isVisible) return null;

  const handlePress = (e) => {
    e?.stopPropagation?.();
    if (onPress) {
      onPress({ nativeEvent: { coordinate: { latitude: markerLat, longitude: markerLng } } });
    }
  };

  return (
    <View
      style={[
        styles.markerAbsolute,
        {
          left: screenX,
          top: screenY,
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity style={styles.markerTouchable} onPress={handlePress} activeOpacity={0.85}>
        {children ? (
          children
        ) : (
          <View style={[styles.defaultPin, pinColor ? { borderColor: pinColor } : null]}>
            <MapPin size={20} color={pinColor || '#38bdf8'} />
          </View>
        )}

        {title && (
          <View style={styles.callout}>
            <Text style={styles.calloutTitle} numberOfLines={1}>
              {title}
            </Text>
            {description ? (
              <Text style={styles.calloutSub} numberOfLines={1}>
                {description}
              </Text>
            ) : null}
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

export const MapView = ({
  style,
  initialRegion,
  region: controlledRegion,
  children,
  onPress,
  showsUserLocation,
  userLocation,
  telemetryTitle,
}) => {
  const windowDim = Dimensions.get('window');
  const [dimensions, setDimensions] = useState({
    width: windowDim.width || 400,
    height: windowDim.height ? Math.min(windowDim.height * 0.55, 420) : 380,
  });
  const [zoom, setZoom] = useState(14);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [internalCenter, setInternalCenter] = useState(null);
  const startPanRef = useRef({ x: 0, y: 0 });
  const didDragRef = useRef(false);

  useEffect(() => {
    if (controlledRegion) {
      setInternalCenter({
        latitude: controlledRegion.latitude,
        longitude: controlledRegion.longitude,
      });
    }
  }, [controlledRegion?.latitude, controlledRegion?.longitude]);

  const activeCenter = internalCenter || controlledRegion || initialRegion || {
    latitude: 12.9716,
    longitude: 77.6412,
  };

  const centerLat = activeCenter.latitude ?? 12.9716;
  const centerLng = activeCenter.longitude ?? 77.6412;

  const handleLayout = (e) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setDimensions({ width, height });
    }
  };

  // Zoom controls
  const handleZoomIn = (e) => {
    e?.stopPropagation?.();
    setZoom((z) => Math.min(18, z + 1));
  };

  const handleZoomOut = (e) => {
    e?.stopPropagation?.();
    setZoom((z) => Math.max(8, z - 1));
  };

  // Pan / Click handlers
  const handlePointerDown = (e) => {
    const clientX = e.nativeEvent?.clientX || e.nativeEvent?.pageX || 0;
    const clientY = e.nativeEvent?.clientY || e.nativeEvent?.pageY || 0;
    startPanRef.current = { x: clientX, y: clientY };
    didDragRef.current = false;
    setIsPanning(true);
  };

  const handlePointerMove = (e) => {
    if (!isPanning) return;
    const clientX = e.nativeEvent?.clientX || e.nativeEvent?.pageX || 0;
    const clientY = e.nativeEvent?.clientY || e.nativeEvent?.pageY || 0;
    const dx = clientX - startPanRef.current.x;
    const dy = clientY - startPanRef.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      didDragRef.current = true;
      setPanOffset({ x: dx, y: dy });
    }
  };

  const handlePointerUp = (e) => {
    setIsPanning(false);

    // If dragged, adjust internal map center so the map remains where dragged
    if (didDragRef.current) {
      const centerWorld = latLngToWorldPixel(centerLat, centerLng, zoom);
      const newWorld = {
        x: centerWorld.x - panOffset.x,
        y: centerWorld.y - panOffset.y,
      };
      setPanOffset({ x: 0, y: 0 });
      const newCoords = worldPixelToLatLng(newWorld.x, newWorld.y, zoom);
      setInternalCenter(newCoords);
      return;
    }

    setPanOffset({ x: 0, y: 0 });

    // Single click / tap to pin location
    if (!onPress) return;
    const locX = e.nativeEvent?.locationX ?? dimensions.width / 2;
    const locY = e.nativeEvent?.locationY ?? dimensions.height / 2;

    const centerWorld = latLngToWorldPixel(centerLat, centerLng, zoom);
    const clickWorldX = centerWorld.x + (locX - dimensions.width / 2);
    const clickWorldY = centerWorld.y + (locY - dimensions.height / 2);

    const clickedCoords = worldPixelToLatLng(clickWorldX, clickWorldY, zoom);
    onPress({ nativeEvent: { coordinate: clickedCoords } });
  };

  // Compute tile grid around center
  const centerWorld = latLngToWorldPixel(centerLat, centerLng, zoom);
  const adjustedWorldX = centerWorld.x - panOffset.x;
  const adjustedWorldY = centerWorld.y - panOffset.y;

  const minXTile = Math.floor((adjustedWorldX - dimensions.width / 2) / TILE_SIZE);
  const maxXTile = Math.floor((adjustedWorldX + dimensions.width / 2) / TILE_SIZE);
  const minYTile = Math.floor((adjustedWorldY - dimensions.height / 2) / TILE_SIZE);
  const maxYTile = Math.floor((adjustedWorldY + dimensions.height / 2) / TILE_SIZE);

  const tiles = [];
  const maxTileIndex = Math.pow(2, zoom) - 1;

  for (let x = minXTile; x <= maxXTile; x++) {
    for (let y = minYTile; y <= maxYTile; y++) {
      if (y >= 0 && y <= maxTileIndex) {
        const wrappedX = ((x % (maxTileIndex + 1)) + (maxTileIndex + 1)) % (maxTileIndex + 1);
        const tileLeft = x * TILE_SIZE - adjustedWorldX + dimensions.width / 2;
        const tileTop = y * TILE_SIZE - adjustedWorldY + dimensions.height / 2;

        // OpenStreetMap standard tile servers (a, b, c)
        const sub = ['a', 'b', 'c'][Math.abs(x + y) % 3];
        const url = `https://${sub}.tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`;

        tiles.push({
          key: `${zoom}-${x}-${y}`,
          url,
          left: tileLeft,
          top: tileTop,
        });
      }
    }
  }

  return (
    <MapContext.Provider
      value={{
        centerLat,
        centerLng,
        zoom,
        width: dimensions.width,
        height: dimensions.height,
      }}
    >
      <View
        style={[styles.webMapContainer, style]}
        onLayout={handleLayout}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handlePointerDown}
        onResponderMove={handlePointerMove}
        onResponderRelease={handlePointerUp}
      >
        {/* Real Map Tiles Layer */}
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          {tiles.map((t) => (
            <Image
              key={t.key}
              source={{
                uri: t.url,
                headers: {
                  'User-Agent': 'ParkEasyMobile/1.0',
                },
              }}
              style={[
                styles.mapTile,
                {
                  left: t.left,
                  top: t.top,
                },
              ]}
              resizeMode="cover"
            />
          ))}
        </View>

        {/* Subtle Dark Overlay to seamlessly blend with ParkEasy UI */}
        <View style={styles.tileDarkShade} pointerEvents="none" />

        {/* User Live Location Beacon Indicator */}
        {showsUserLocation && (() => {
          const uLat = userLocation?.latitude ?? centerLat;
          const uLng = userLocation?.longitude ?? centerLng;
          if (uLat != null && uLng != null) {
            const centerW = latLngToWorldPixel(centerLat, centerLng, zoom);
            const userW = latLngToWorldPixel(uLat, uLng, zoom);
            const ux = userW.x - centerW.x + dimensions.width / 2;
            const uy = userW.y - centerW.y + dimensions.height / 2;
            if (
              ux >= -50 &&
              ux <= dimensions.width + 50 &&
              uy >= -50 &&
              uy <= dimensions.height + 50
            ) {
              return (
                <View
                  style={[
                    styles.userBeaconContainer,
                    {
                      left: ux,
                      top: uy,
                    },
                  ]}
                  pointerEvents="none"
                >
                  <View style={styles.userBeaconAura} />
                  <View style={styles.userBeaconCore} />
                  <View style={styles.userBeaconTag}>
                    <Text style={styles.userBeaconTagText}>📍 You Are Here</Text>
                  </View>
                </View>
              );
            }
            return null;
          }
          return null;
        })()}

        {/* Real Geographically Rendered Markers */}
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          {children}
        </View>

        {/* Telemetry Header */}
        <View style={styles.mapPill} pointerEvents="none">
          <Compass size={12} color="#38bdf8" />
          <Text style={styles.mapPillText} numberOfLines={1}>
            {telemetryTitle || `OpenStreetMap • Lat: ${centerLat.toFixed(4)}, Lng: ${centerLng.toFixed(4)}`}
          </Text>
        </View>

        {/* Zoom Controls (+ and -) */}
        <View style={styles.zoomControlsContainer}>
          <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomIn} activeOpacity={0.8}>
            <Text style={styles.zoomBtnText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomOut} activeOpacity={0.8}>
            <Text style={styles.zoomBtnText}>−</Text>
          </TouchableOpacity>
        </View>

        {/* Attribution Badge */}
        <View style={styles.attributionPill} pointerEvents="none">
          <Text style={styles.attributionText}>© OpenStreetMap contributors</Text>
        </View>
      </View>
    </MapContext.Provider>
  );
};

export default MapView;

const styles = StyleSheet.create({
  webMapContainer: {
    backgroundColor: '#0f172a',
    position: 'relative',
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? { cursor: 'crosshair' } : {}),
  },
  mapTile: {
    position: 'absolute',
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  tileDarkShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.15)',
  },
  userBeaconContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateX: -40 }, { translateY: -40 }],
    width: 80,
    height: 80,
    zIndex: 50,
  },
  userBeaconAura: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(56, 189, 248, 0.35)',
    borderWidth: 2,
    borderColor: '#38bdf8',
  },
  userBeaconCore: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#0284c7',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },
  userBeaconTag: {
    position: 'absolute',
    top: 4,
    backgroundColor: '#0284c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
  },
  userBeaconTagText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  markerAbsolute: {
    position: 'absolute',
    transform: [{ translateX: -18 }, { translateY: -38 }],
    zIndex: 25,
  },
  markerTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0f172a',
    borderWidth: 2,
    borderColor: '#38bdf8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  callout: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 4,
    alignItems: 'center',
    maxWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  calloutTitle: {
    color: '#f8fafc',
    fontSize: 10,
    fontWeight: '700',
  },
  calloutSub: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '500',
  },
  mapPill: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    zIndex: 30,
  },
  mapPillText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
  },
  zoomControlsContainer: {
    position: 'absolute',
    right: 12,
    bottom: 24,
    gap: 6,
    zIndex: 30,
  },
  zoomBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  zoomBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
  attributionPill: {
    position: 'absolute',
    left: 8,
    bottom: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 20,
  },
  attributionText: {
    color: '#64748b',
    fontSize: 8,
  },
});
