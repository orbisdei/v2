// My Lists tab — auth-gated. Shows the user's lists with counts and
// preview thumbnails; tapping a list opens its sites.

import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { getUserLists } from '../../lib/data';
import { cfImage } from '../../lib/imageUrl';
import { Colors, Fonts } from '../../constants/theme';
import type { UserListWithCount } from '../../lib/types';

export default function ListsScreen() {
  const { session, loading: authLoading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [lists, setLists] = useState<UserListWithCount[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (session?.user) {
        getUserLists(session.user.id).then((rows) => {
          if (!cancelled) setLists(rows);
        });
      } else {
        setLists(null);
      }
      return () => {
        cancelled = true;
      };
    }, [session?.user?.id])
  );

  if (authLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.navy} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.center}>
        <Ionicons name="bookmark-outline" size={40} color={Colors.textSecondary} />
        <Text style={styles.emptyTitle}>Sign in to see your lists</Text>
        <Text style={styles.emptyBody}>Save sites to lists and track the places you've visited.</Text>
        <Pressable style={styles.signInBtn} onPress={() => signInWithGoogle().catch(() => {})}>
          <Ionicons name="logo-google" size={16} color="#fff" />
          <Text style={styles.signInLabel}>Continue with Google</Text>
        </Pressable>
      </View>
    );
  }

  if (!lists) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.navy} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={lists}
      keyExtractor={(l) => l.id}
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
                <Ionicons name="image-outline" size={18} color={Colors.textSecondary} />
              </View>
            )}
          </View>
          <View style={styles.listText}>
            <Text style={styles.listName}>{item.name}</Text>
            <Text style={styles.listMeta}>
              {item.site_count} {item.site_count === 1 ? 'site' : 'sites'}
              {item.is_public ? '  ·  Public' : ''}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
        </Pressable>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={<Text style={styles.emptyBody}>No lists yet.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  emptyTitle: { fontFamily: Fonts.serif, fontSize: 18, color: Colors.navy, fontWeight: '700' },
  emptyBody: { color: Colors.textSecondary, textAlign: 'center', padding: 8 },
  signInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.navy,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  signInLabel: { color: '#fff', fontWeight: '700' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  thumbStrip: { flexDirection: 'row', gap: 2 },
  thumb: { width: 40, height: 40, borderRadius: 6, backgroundColor: Colors.backgroundMuted },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  listText: { flex: 1 },
  listName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  listMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  separator: { height: 1, backgroundColor: Colors.border, marginLeft: 12 },
});
