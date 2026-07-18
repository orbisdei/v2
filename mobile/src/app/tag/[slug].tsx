// Tag detail screen — description + list of sites carrying the tag.

import { useEffect, useState } from 'react';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { getSitesByTag, getTagBySlug } from '../../lib/data';
import { useVisited } from '../../hooks/useVisited';
import { SiteCard } from '../../components/SiteCard';
import { cfImage } from '../../lib/imageUrl';
import { RichText } from '../../lib/richText';
import { Colors, Fonts } from '../../constants/theme';
import type { Site, Tag } from '../../lib/types';

export default function TagScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const navigation = useNavigation();
  const { isVisited } = useVisited();
  const [tag, setTag] = useState<Tag | null | undefined>(undefined);
  const [sites, setSites] = useState<Site[]>([]);

  useEffect(() => {
    if (!slug) return;
    getTagBySlug(slug).then((t) => setTag(t ?? null));
    getSitesByTag(slug).then(setSites);
  }, [slug]);

  useEffect(() => {
    if (tag) navigation.setOptions({ title: tag.name });
  }, [tag, navigation]);

  if (tag === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.navy} />
      </View>
    );
  }

  if (tag === null) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Tag not found.</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={sites}
      keyExtractor={(s) => s.id}
      ListHeaderComponent={
        <View style={styles.header}>
          {tag.image_url ? (
            <Image source={{ uri: cfImage(tag.image_url, 640) }} style={styles.hero} contentFit="cover" />
          ) : null}
          <Text style={styles.name}>{tag.name}</Text>
          {tag.dedication ? <Text style={styles.dedication}>{tag.dedication}</Text> : null}
          {tag.description ? <RichText text={tag.description} style={styles.description} /> : null}
          <Text style={styles.count}>
            {sites.length} {sites.length === 1 ? 'site' : 'sites'}
          </Text>
        </View>
      }
      renderItem={({ item }) => <SiteCard site={item} visited={isVisited(item.id)} />}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: Colors.textSecondary },
  header: { padding: 16, gap: 8 },
  hero: { width: '100%', height: 180, borderRadius: 12, backgroundColor: Colors.backgroundMuted },
  name: { fontFamily: Fonts.serif, fontSize: 22, fontWeight: '700', color: Colors.navy },
  dedication: { fontSize: 13, fontStyle: 'italic', color: Colors.gold },
  description: { fontSize: 14, lineHeight: 21, color: Colors.text },
  count: { fontSize: 12, color: Colors.textSecondary, textTransform: 'uppercase', fontWeight: '700' },
  separator: { height: 1, backgroundColor: Colors.border, marginLeft: 96 },
});
