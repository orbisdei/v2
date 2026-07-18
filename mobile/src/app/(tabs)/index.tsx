// Map home screen — the mobile counterpart of the web homepage map view.
// Pins are clustered with supercluster (recomputed on region change);
// tapping a cluster zooms in, tapping a pin shows a floating SiteCard
// (same pattern as the web mobile split view's SiteFloatingCard).

import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import Supercluster from 'supercluster';
import { useCatalog } from '../../lib/catalog';
import { useVisited } from '../../hooks/useVisited';
import { useAuth } from '../../lib/auth';
import {
  filterByInterest,
  getAvailableLevels,
  PUBLIC_LEVELS,
  type InterestLevel,
} from '../../lib/interestFilter';
import { SiteCard } from '../../components/SiteCard';
import { InterestFilter } from '../../components/InterestFilter';
import { Colors } from '../../constants/theme';

const INITIAL_REGION: Region = { latitude: 41.9, longitude: 12.5, latitudeDelta: 40, longitudeDelta: 40 };

function regionToZoom(region: Region): number {
  return Math.round(Math.log2(360 / region.longitudeDelta));
}

type PointProps = { siteId: string };

export default function MapScreen() {
  const { sites, loading, error } = useCatalog();
  const { profile } = useAuth();
  const { isVisited } = useVisited();
  const mapRef = useRef<MapView>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [region, setRegion] = useState<Region>(INITIAL_REGION);
  const [activeLevels, setActiveLevels] = useState<Set<InterestLevel>>(new Set(PUBLIC_LEVELS));
  const [locating, setLocating] = useState(false);

  const visibleSites = useMemo(() => filterByInterest(sites, activeLevels), [sites, activeLevels]);
  const sitesById = useMemo(() => new Map(visibleSites.map((s) => [s.id, s])), [visibleSites]);
  const selected = selectedId ? (sitesById.get(selectedId) ?? null) : null;

  const clusterIndex = useMemo(() => {
    const index = new Supercluster<PointProps>({ radius: 44, maxZoom: 15 });
    index.load(
      visibleSites.map((site) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [site.longitude, site.latitude] },
        properties: { siteId: site.id },
      }))
    );
    return index;
  }, [visibleSites]);

  const clusters = useMemo(() => {
    // Pad the bbox one half-screen in each direction so pins pop in before
    // they scroll into view.
    const west = region.longitude - region.longitudeDelta;
    const east = region.longitude + region.longitudeDelta;
    const south = Math.max(-85, region.latitude - region.latitudeDelta);
    const north = Math.min(85, region.latitude + region.latitudeDelta);
    return clusterIndex.getClusters([Math.max(-180, west), south, Math.min(180, east), north], regionToZoom(region));
  }, [clusterIndex, region]);

  const toggleLevel = (level: InterestLevel) => {
    setActiveLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) {
        if (next.size > 1) next.delete(level); // never allow zero active levels
      } else {
        next.add(level);
      }
      return next;
    });
  };

  const zoomIntoCluster = useCallback(
    (clusterId: number, latitude: number, longitude: number) => {
      const zoom = Math.min(clusterIndex.getClusterExpansionZoom(clusterId), 17);
      const longitudeDelta = 360 / Math.pow(2, zoom);
      mapRef.current?.animateToRegion(
        { latitude, longitude, latitudeDelta: longitudeDelta * 0.7, longitudeDelta },
        300
      );
    },
    [clusterIndex]
  );

  const locateMe = useCallback(async () => {
    if (locating) return;
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location unavailable', 'Allow location access to find holy sites near you.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      mapRef.current?.animateToRegion(
        {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          latitudeDelta: 1.5,
          longitudeDelta: 1.5,
        },
        500
      );
    } catch {
      Alert.alert('Location unavailable', 'Could not determine your position.');
    } finally {
      setLocating(false);
    }
  }, [locating]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.navy} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Could not load sites: {error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={INITIAL_REGION}
        onRegionChangeComplete={setRegion}
        onPress={() => setSelectedId(null)}
        toolbarEnabled={false}
      >
        {clusters.map((feature) => {
          const [longitude, latitude] = feature.geometry.coordinates;
          const props = feature.properties;
          if ('cluster' in props && props.cluster) {
            const count = props.point_count;
            return (
              <Marker
                key={`cluster-${props.cluster_id}`}
                coordinate={{ latitude, longitude }}
                tracksViewChanges={false}
                onPress={(e) => {
                  e.stopPropagation();
                  zoomIntoCluster(props.cluster_id, latitude, longitude);
                }}
              >
                <View style={[styles.clusterBubble, count >= 100 && styles.clusterBubbleLg]}>
                  <Text style={styles.clusterLabel}>{count}</Text>
                </View>
              </Marker>
            );
          }
          const siteId = (props as PointProps).siteId;
          return (
            <Marker
              key={siteId}
              coordinate={{ latitude, longitude }}
              pinColor={isVisited(siteId) ? Colors.visitedGreen : Colors.navy}
              onPress={(e) => {
                e.stopPropagation();
                setSelectedId(siteId);
              }}
            />
          );
        })}
      </MapView>

      <View style={styles.filterWrap}>
        <InterestFilter
          availableLevels={getAvailableLevels(profile?.role)}
          activeLevels={activeLevels}
          onToggle={toggleLevel}
        />
      </View>

      <Pressable
        style={[styles.locateBtn, selected && styles.locateBtnRaised]}
        onPress={locateMe}
        accessibilityLabel="Show my location"
      >
        {locating ? (
          <ActivityIndicator size="small" color={Colors.navy} />
        ) : (
          <Ionicons name="locate" size={22} color={Colors.navy} />
        )}
      </Pressable>

      {selected && (
        <View style={styles.floatingCard}>
          <SiteCard site={selected} visited={isVisited(selected.id)} onClose={() => setSelectedId(null)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  error: { color: Colors.textSecondary, textAlign: 'center' },
  filterWrap: { position: 'absolute', top: 12, alignSelf: 'center' },
  clusterBubble: {
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 8,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  clusterBubbleLg: { minWidth: 42, height: 42, borderRadius: 21 },
  clusterLabel: { color: '#fff', fontWeight: '700', fontSize: 13 },
  locateBtn: {
    position: 'absolute',
    right: 12,
    bottom: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  locateBtnRaised: { bottom: 128 },
  floatingCard: {
    position: 'absolute',
    bottom: 12,
    left: 10,
    right: 10,
    borderRadius: 12,
    backgroundColor: Colors.background,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
});
