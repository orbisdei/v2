// List detail screen — list metadata + owner attribution + ordered sites
// (read-only; editing/reordering stays on the web for now).

import { useEffect, useState } from 'react';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { getListDetail } from '../../lib/data';
import { useAuth } from '../../lib/auth';
import { useVisited } from '../../hooks/useVisited';
import { SiteCard } from '../../components/SiteCard';
import { RichText } from '../../lib/richText';
import { Colors, Fonts } from '../../constants/theme';
import type { UserListDetail } from '../../lib/types';

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const { session } = useAuth();
  const { isVisited } = useVisited();
  const [list, setList] = useState<UserListDetail | null | undefined>(undefined);

  useEffect(() => {
    if (id) getListDetail(id).then((l) => setList(l ?? null));
  }, [id]);

  useEffect(() => {
    if (list) navigation.setOptions({ title: list.name });
  }, [list, navigation]);

  if (list === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.navy} />
      </View>
    );
  }

  if (list === null) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>List not found.</Text>
      </View>
    );
  }

  const isOwner = session?.user?.id === list.user_id;

  return (
    <FlatList
      style={styles.container}
      data={list.sites}
      keyExtractor={(s) => s.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.name}>{list.name}</Text>
            {list.is_public && <Text style={styles.publicBadge}>Public</Text>}
          </View>
          {list.description ? <RichText text={list.description} style={styles.description} /> : null}
          {!isOwner && list.owner_initials_display ? (
            <Pressable
              style={styles.ownerRow}
              onPress={() =>
                router.push({ pathname: '/user/[initials]', params: { initials: list.owner_initials_display } })
              }
            >
              {list.owner_avatar_url ? (
                <Image source={{ uri: list.owner_avatar_url }} style={styles.ownerAvatar} />
              ) : (
                <View style={[styles.ownerAvatar, styles.ownerAvatarFallback]}>
                  <Text style={styles.ownerInitials}>{list.owner_initials_display}</Text>
                </View>
              )}
              <Text style={styles.ownerName}>
                by {list.owner_display_name ?? list.owner_initials_display}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.textSecondary} />
            </Pressable>
          ) : null}
          <Text style={styles.count}>
            {list.sites.length} {list.sites.length === 1 ? 'site' : 'sites'}
          </Text>
        </View>
      }
      renderItem={({ item }) => <SiteCard site={item} visited={isVisited(item.id)} />}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={<Text style={styles.empty}>This list is empty.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: Colors.textSecondary },
  header: { padding: 16, gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { fontFamily: Fonts.serif, fontSize: 22, fontWeight: '700', color: Colors.navy },
  publicBadge: {
    fontSize: 11,
    color: Colors.featuredText,
    backgroundColor: Colors.featuredBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  description: { fontSize: 14, lineHeight: 21, color: Colors.text },
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ownerAvatar: { width: 24, height: 24, borderRadius: 12 },
  ownerAvatarFallback: { backgroundColor: Colors.navy, alignItems: 'center', justifyContent: 'center' },
  ownerInitials: { color: '#fff', fontSize: 9, fontWeight: '700' },
  ownerName: { fontSize: 13, color: Colors.textSecondary },
  count: { fontSize: 12, color: Colors.textSecondary, textTransform: 'uppercase', fontWeight: '700' },
  separator: { height: 1, backgroundColor: Colors.border, marginLeft: 96 },
  empty: { padding: 24, textAlign: 'center', color: Colors.textSecondary },
});
