// Map home screen — the mobile counterpart of the web homepage map view.
// Pin tap shows a floating SiteCard over the map (same pattern as the web
// mobile split view's SiteFloatingCard).

import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
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

export default function MapScreen() {
  const { sites, loading, error } = useCatalog();
  const { profile } = useAuth();
  const { isVisited } = useVisited();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeLevels, setActiveLevels] = useState<Set<InterestLevel>>(new Set(PUBLIC_LEVELS));

  const visibleSites = useMemo(() => filterByInterest(sites, activeLevels), [sites, activeLevels]);
  const selected = useMemo(
    () => visibleSites.find((s) => s.id === selectedId) ?? null,
    [visibleSites, selectedId]
  );

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
        style={StyleSheet.absoluteFill}
        initialRegion={{ latitude: 41.9, longitude: 12.5, latitudeDelta: 40, longitudeDelta: 40 }}
        onPress={() => setSelectedId(null)}
        toolbarEnabled={false}
      >
        {visibleSites.map((site) => (
          <Marker
            key={site.id}
            coordinate={{ latitude: site.latitude, longitude: site.longitude }}
            pinColor={isVisited(site.id) ? Colors.visitedGreen : Colors.navy}
            onPress={(e) => {
              e.stopPropagation();
              setSelectedId(site.id);
            }}
          />
        ))}
      </MapView>

      <View style={styles.filterWrap}>
        <InterestFilter
          availableLevels={getAvailableLevels(profile?.role)}
          activeLevels={activeLevels}
          onToggle={toggleLevel}
        />
      </View>

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
