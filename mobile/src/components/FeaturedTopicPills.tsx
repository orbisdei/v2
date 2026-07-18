// Mobile counterpart of the web FeaturedTopicPills: horizontal scrollable
// row of featured topic tags for discovery.

import { ScrollView, StyleSheet } from 'react-native';
import { useCatalog } from '../lib/catalog';
import { TagPill } from './TagPill';

export function FeaturedTopicPills() {
  const { tags } = useCatalog();
  const featured = tags.filter((t) => t.featured && (t.type === 'topic' || !t.type));
  if (featured.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      {featured.map((tag) => (
        <TagPill key={tag.id} tag={tag} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingHorizontal: 12, paddingBottom: 10 },
});
