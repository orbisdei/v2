// Mobile counterpart of the web app's SiteCard: the single site-preview
// layout used in list rows, search results, and the map's floating card.
// Keep all site-preview styling here — do not fork per-screen variants.

import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '../constants/theme';
import { cfImage } from '../lib/imageUrl';
import { getCountryName } from '../lib/countries';
import type { Site } from '../lib/types';

function locationLine(site: Site): string {
  return [site.municipality, site.region, site.country ? getCountryName(site.country) : undefined]
    .filter(Boolean)
    .join(', ');
}

interface SiteCardProps {
  site: Site;
  visited?: boolean;
  onClose?: () => void;
}

export function SiteCard({ site, visited, onClose }: SiteCardProps) {
  const router = useRouter();
  const thumb = site.images[0]?.url;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/site/[id]', params: { id: site.id } })}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.thumbWrap}>
        {thumb ? (
          <Image source={{ uri: cfImage(thumb, 320) }} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Ionicons name="image-outline" size={22} color={Colors.textSecondary} />
          </View>
        )}
        {visited && (
          <View style={styles.visitedBadge}>
            <Ionicons name="checkmark" size={12} color="#fff" />
          </View>
        )}
      </View>
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={2}>
          {site.name}
        </Text>
        {locationLine(site) ? (
          <Text style={styles.location} numberOfLines={1}>
            {locationLine(site)}
          </Text>
        ) : null}
        <Text style={styles.description} numberOfLines={2}>
          {site.short_description}
        </Text>
      </View>
      {onClose && (
        <Pressable onPress={onClose} hitSlop={10} style={styles.close}>
          <Ionicons name="close" size={18} color={Colors.textSecondary} />
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    backgroundColor: Colors.background,
    alignItems: 'flex-start',
  },
  thumbWrap: { position: 'relative' },
  thumb: { width: 72, height: 72, borderRadius: 8, backgroundColor: Colors.backgroundMuted },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  visitedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.visitedGreen,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  text: { flex: 1, gap: 2 },
  name: { fontFamily: Fonts.serif, fontSize: 16, color: Colors.navy, fontWeight: '700' },
  location: { fontSize: 12, color: Colors.textSecondary },
  description: { fontSize: 13, color: Colors.text, lineHeight: 18 },
  close: { padding: 2 },
});
