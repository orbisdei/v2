// Profile tab — sign in / out, basic profile info, visited count.

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth';
import { getVisitedSiteIds } from '../../lib/data';
import { Colors, Fonts } from '../../constants/theme';

export default function ProfileScreen() {
  const { session, profile, signInWithGoogle, signOut } = useAuth();
  const [visitedCount, setVisitedCount] = useState<number | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      getVisitedSiteIds(session.user.id).then((ids) => setVisitedCount(ids.size));
    } else {
      setVisitedCount(null);
    }
  }, [session?.user?.id]);

  if (!session) {
    return (
      <View style={styles.center}>
        <Text style={styles.appName}>Orbis Dei</Text>
        <Text style={styles.tagline}>Explore Catholic and Christian holy sites around the world.</Text>
        <Pressable
          style={styles.signInBtn}
          onPress={() => {
            setAuthError(null);
            signInWithGoogle().catch((e) => setAuthError(e instanceof Error ? e.message : 'Sign-in failed'));
          }}
        >
          <Ionicons name="logo-google" size={16} color="#fff" />
          <Text style={styles.signInLabel}>Continue with Google</Text>
        </Pressable>
        {authError && <Text style={styles.error}>{authError}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitials}>{profile?.initials_display ?? '?'}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.displayName}>{profile?.display_name ?? session.user.email}</Text>
          {profile && <Text style={styles.role}>{profile.role}</Text>}
        </View>
      </View>

      <View style={styles.statRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{visitedCount ?? '–'}</Text>
          <Text style={styles.statLabel}>sites visited</Text>
        </View>
      </View>

      {profile?.about_me ? <Text style={styles.about}>{profile.about_me}</Text> : null}

      <Pressable style={styles.signOutBtn} onPress={() => signOut()}>
        <Ionicons name="log-out-outline" size={16} color={Colors.navy} />
        <Text style={styles.signOutLabel}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 16, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  appName: { fontFamily: Fonts.serif, fontSize: 28, color: Colors.navy, fontWeight: '700' },
  tagline: { color: Colors.textSecondary, textAlign: 'center' },
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
  error: { color: '#b0413e', textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarFallback: { backgroundColor: Colors.navy, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { color: '#fff', fontWeight: '700' },
  displayName: { fontSize: 18, fontWeight: '700', color: Colors.text },
  role: { fontSize: 12, color: Colors.textSecondary, textTransform: 'capitalize' },
  statRow: { flexDirection: 'row', gap: 12 },
  stat: {
    backgroundColor: Colors.backgroundMuted,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  statValue: { fontFamily: Fonts.serif, fontSize: 22, color: Colors.visitedGreen, fontWeight: '700' },
  statLabel: { fontSize: 12, color: Colors.textSecondary },
  about: { color: Colors.text, lineHeight: 20 },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 'auto', alignSelf: 'center', padding: 12 },
  signOutLabel: { color: Colors.navy, fontWeight: '700' },
});
