// Public user profile — mobile counterpart of /user/[initials_display]:
// display name, avatar, role, about me, member-since, visited count,
// and public lists. Shows only explicitly public information.

import { useEffect, useState } from 'react';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { getProfileByInitials, getPublicListsForUser, getVisitedCountForUser } from '../../lib/data';
import { cfImage } from '../../lib/imageUrl';
import { RichText } from '../../lib/richText';
import { Colors, Fonts } from '../../constants/theme';
import type { PublicProfile, UserListSummary } from '../../lib/types';

export default function PublicProfileScreen() {
  const { initials } = useLocalSearchParams<{ initials: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const [profile, setProfile] = useState<PublicProfile | null | undefined>(undefined);
  const [lists, setLists] = useState<UserListSummary[]>([]);
  const [visitedCount, setVisitedCount] = useState(0);

  useEffect(() => {
    if (!initials) return;
    getProfileByInitials(initials).then((p) => {
      setProfile(p ?? null);
      if (p) {
        getPublicListsForUser(p.id).then(setLists);
        getVisitedCountForUser(p.id).then(setVisitedCount);
      }
    });
  }, [initials]);

  useEffect(() => {
    if (profile) navigation.setOptions({ title: profile.display_name ?? profile.initials_display });
  }, [profile, navigation]);

  if (profile === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.navy} />
      </View>
    );
  }

  if (profile === null) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Profile not found.</Text>
      </View>
    );
  }

  const memberSince = new Date(profile.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
  });

  return (
    <FlatList
      style={styles.container}
      data={lists}
      keyExtractor={(l) => l.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.identityRow}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitials}>{profile.initials_display}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.displayName}>{profile.display_name ?? profile.initials_display}</Text>
              <Text style={styles.meta}>
                {profile.role !== 'general' ? `${profile.role}  ·  ` : ''}Member since {memberSince}
              </Text>
              <Text style={styles.meta}>
                {visitedCount} {visitedCount === 1 ? 'site' : 'sites'} visited
              </Text>
            </View>
          </View>
          {profile.about_me ? <RichText text={profile.about_me} style={styles.about} /> : null}
          {lists.length > 0 && <Text style={styles.sectionLabel}>Public lists</Text>}
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          style={({ pressed }) => [styles.listRow, pressed && { opacity: 0.85 }]}
          onPress={() => router.push({ pathname: '/list/[id]', params: { id: item.id } })}
        >
          <View style={styles.thumbStrip}>
            {item.preview_thumbnails.length > 0 ? (
              item.preview_thumbnails.map((url) => (
                <Image key={url} source={{ uri: cfImage(url, 160) }} style={styles.thumb} contentFit="cover" />
              ))
            ) : (
              <View style={[styles.thumb, styles.thumbEmpty]}>
                <Ionicons name="image-outline" size={16} color={Colors.textSecondary} />
              </View>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.listName}>{item.name}</Text>
            <Text style={styles.listMeta}>
              {item.site_count} {item.site_count === 1 ? 'site' : 'sites'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
        </Pressable>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: Colors.textSecondary },
  header: { padding: 16, gap: 12 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarFallback: { backgroundColor: Colors.navy, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { color: '#fff', fontWeight: '700' },
  displayName: { fontFamily: Fonts.serif, fontSize: 20, fontWeight: '700', color: Colors.navy },
  meta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  about: { fontSize: 14, lineHeight: 21, color: Colors.text },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  thumbStrip: { flexDirection: 'row', gap: 2 },
  thumb: { width: 36, height: 36, borderRadius: 6, backgroundColor: Colors.backgroundMuted },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  listName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  listMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  separator: { height: 1, backgroundColor: Colors.border, marginLeft: 16 },
});
