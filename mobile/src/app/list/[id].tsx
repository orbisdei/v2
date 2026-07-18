// List detail screen — read-only view of a user list's sites.
// (Editing/reordering stays on the web for now.)

import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { getListSites } from '../../lib/data';
import { useVisited } from '../../hooks/useVisited';
import { SiteCard } from '../../components/SiteCard';
import { Colors } from '../../constants/theme';
import type { Site } from '../../lib/types';

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isVisited } = useVisited();
  const [sites, setSites] = useState<Site[] | null>(null);

  useEffect(() => {
    if (id) getListSites(id).then(setSites);
  }, [id]);

  if (!sites) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.navy} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={sites}
      keyExtractor={(s) => s.id}
      renderItem={({ item }) => <SiteCard site={item} visited={isVisited(item.id)} />}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={<Text style={styles.empty}>This list is empty.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  separator: { height: 1, backgroundColor: Colors.border, marginLeft: 96 },
  empty: { padding: 24, textAlign: 'center', color: Colors.textSecondary },
});
