// Site detail screen — mobile counterpart of /site/[slug] on the web:
// photo gallery, name/location/description, visited toggle, directions,
// tags, and external links.

import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { getSiteBySlug } from '../../lib/data';
import { useCatalog } from '../../lib/catalog';
import { useVisited } from '../../hooks/useVisited';
import { useLists } from '../../hooks/useLists';
import { SaveToListPanel } from '../../components/SaveToListPanel';
import { RichText } from '../../lib/richText';
import { cfImage } from '../../lib/imageUrl';
import { getCountryName } from '../../lib/countries';
import { Colors, Fonts } from '../../constants/theme';
import { TagPill } from '../../components/TagPill';
import type { Site } from '../../lib/types';

export default function SiteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const { tagsById } = useCatalog();
  const { isVisited, toggleVisited, isLoggedIn } = useVisited();
  const { isOnAnyList } = useLists();
  const [site, setSite] = useState<Site | null | undefined>(undefined);
  const [savePanelOpen, setSavePanelOpen] = useState(false);

  useEffect(() => {
    if (id) getSiteBySlug(id).then((s) => setSite(s ?? null));
  }, [id]);

  useEffect(() => {
    if (site) navigation.setOptions({ title: site.name });
  }, [site, navigation]);

  const tags = useMemo(
    () => (site ? site.tag_ids.map((tid) => tagsById.get(tid)).filter((t) => !!t) : []),
    [site, tagsById]
  );

  if (site === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.navy} />
      </View>
    );
  }

  if (site === null) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Site not found.</Text>
      </View>
    );
  }

  const visited = isVisited(site.id);
  const location = [site.municipality, site.region, site.country ? getCountryName(site.country) : undefined]
    .filter(Boolean)
    .join(', ');

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      {site.images.length > 0 && (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {site.images.map((img) => (
            <View key={img.url}>
              <Image
                source={{ uri: cfImage(img.url, 1600) }}
                style={{ width, height: width * 0.66 }}
                contentFit="cover"
              />
              {img.caption ? (
                <Text style={[styles.caption, { width }]} numberOfLines={2}>
                  {img.caption}
                </Text>
              ) : null}
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.body}>
        <Text style={styles.name}>{site.name}</Text>
        {site.native_name ? <Text style={styles.nativeName}>{site.native_name}</Text> : null}
        {location ? <Text style={styles.location}>{location}</Text> : null}

        <View style={styles.actions}>
          <Pressable
            style={[styles.actionBtn, visited && styles.actionBtnVisited]}
            disabled={!isLoggedIn}
            onPress={() => toggleVisited(site.id)}
          >
            <Ionicons name="checkmark" size={16} color={visited ? '#fff' : Colors.visitedGreen} />
            <Text style={[styles.actionLabel, { color: visited ? '#fff' : Colors.visitedGreen }]}>
              {visited ? 'Visited' : isLoggedIn ? 'Mark visited' : 'Sign in to track'}
            </Text>
          </Pressable>
          {isLoggedIn && (
            <Pressable
              style={[styles.actionBtn, isOnAnyList(site.id) && styles.actionBtnSaved]}
              onPress={() => setSavePanelOpen(true)}
            >
              <Ionicons
                name={isOnAnyList(site.id) ? 'bookmark' : 'bookmark-outline'}
                size={16}
                color={isOnAnyList(site.id) ? '#fff' : Colors.navy}
              />
              <Text style={[styles.actionLabel, { color: isOnAnyList(site.id) ? '#fff' : Colors.navy }]}>
                {isOnAnyList(site.id) ? 'Saved' : 'Save'}
              </Text>
            </Pressable>
          )}
          {site.google_maps_url ? (
            <Pressable style={styles.actionBtn} onPress={() => Linking.openURL(site.google_maps_url)}>
              <Ionicons name="navigate-outline" size={16} color={Colors.navy} />
              <Text style={[styles.actionLabel, { color: Colors.navy }]}>Directions</Text>
            </Pressable>
          ) : null}
        </View>

        <RichText text={site.short_description} style={styles.description} />

        {tags.length > 0 && (
          <View style={styles.tagRow}>
            {tags.map((tag) => (
              <TagPill key={tag.id} tag={tag} />
            ))}
          </View>
        )}

        {site.links.length > 0 && (
          <View style={styles.links}>
            <Text style={styles.sectionTitle}>Links</Text>
            {site.links.map((link) => (
              <Pressable key={link.url} style={styles.linkRow} onPress={() => Linking.openURL(link.url)}>
                <Ionicons name="open-outline" size={15} color={Colors.navy} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.linkLabel}>{link.link_type}</Text>
                  {link.comment ? <Text style={styles.linkComment}>{link.comment}</Text> : null}
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <SaveToListPanel siteId={site.id} visible={savePanelOpen} onClose={() => setSavePanelOpen(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: Colors.textSecondary },
  caption: { paddingHorizontal: 16, paddingTop: 6, fontSize: 12, color: Colors.textSecondary },
  body: { padding: 16, gap: 12 },
  name: { fontFamily: Fonts.serif, fontSize: 24, fontWeight: '700', color: Colors.navy },
  nativeName: { fontSize: 15, color: Colors.textSecondary, fontStyle: 'italic', marginTop: -8 },
  location: { fontSize: 13, color: Colors.textSecondary, marginTop: -6 },
  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  actionBtnVisited: { backgroundColor: Colors.visitedGreen, borderColor: Colors.visitedGreen },
  actionBtnSaved: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  actionLabel: { fontSize: 13, fontWeight: '700' },
  description: { fontSize: 15, lineHeight: 22, color: Colors.text },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  links: { gap: 8, marginTop: 4 },
  sectionTitle: { fontFamily: Fonts.serif, fontSize: 17, fontWeight: '700', color: Colors.navy },
  linkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 4 },
  linkLabel: { color: Colors.navy, fontWeight: '600', fontSize: 14 },
  linkComment: { color: Colors.textSecondary, fontSize: 12 },
});
