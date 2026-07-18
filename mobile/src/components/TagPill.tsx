// Mobile counterpart of the web TagPill: navigates to the tag page.
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Colors } from '../constants/theme';
import type { Tag } from '../lib/types';

export function TagPill({ tag }: { tag: Tag }) {
  const router = useRouter();
  const isTopic = tag.type === 'topic' || !tag.type;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/tag/[slug]', params: { slug: tag.id } })}
      style={({ pressed }) => [styles.pill, isTopic ? styles.topic : styles.location, pressed && { opacity: 0.7 }]}
    >
      <Text style={[styles.label, isTopic ? styles.topicLabel : styles.locationLabel]} numberOfLines={1}>
        {tag.name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  topic: { backgroundColor: '#f2f2fa', borderColor: '#d8d8ec' },
  location: { backgroundColor: Colors.featuredBg, borderColor: '#ecdfae' },
  label: { fontSize: 12, fontWeight: '600' },
  topicLabel: { color: Colors.navy },
  locationLabel: { color: Colors.featuredText },
});
