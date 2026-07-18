// Search screen — client-side filter over the shared catalog (name,
// description, location), same fields the web search page matches on.

import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCatalog } from '../../lib/catalog';
import { useVisited } from '../../hooks/useVisited';
import { SiteCard } from '../../components/SiteCard';
import { FeaturedTopicPills } from '../../components/FeaturedTopicPills';
import { Colors } from '../../constants/theme';
import { getCountryName } from '../../lib/countries';

export default function SearchScreen() {
  const { sites, tagsById } = useCatalog();
  const { isVisited } = useVisited();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sites.filter((s) => s.featured);
    return sites.filter((s) => {
      const haystack = [
        s.name,
        s.native_name,
        s.short_description,
        s.municipality,
        s.region,
        s.country ? getCountryName(s.country) : undefined,
        ...s.tag_ids.map((id) => tagsById.get(id)?.name),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [sites, tagsById, query]);

  return (
    <View style={styles.container}>
      <View style={styles.inputWrap}>
        <Ionicons name="search" size={18} color={Colors.textSecondary} />
        <TextInput
          style={styles.input}
          placeholder="Search holy sites, places, topics…"
          placeholderTextColor={Colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>
      {!query && (
        <>
          <FeaturedTopicPills />
          <Text style={styles.sectionLabel}>Featured sites</Text>
        </>
      )}
      <FlatList
        data={results}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => <SiteCard site={item} visited={isVisited(item.id)} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <Text style={styles.empty}>No sites match “{query.trim()}”.</Text>
        }
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundMuted,
  },
  input: { flex: 1, paddingVertical: 10, fontSize: 15, color: Colors.text },
  sectionLabel: {
    paddingHorizontal: 12,
    paddingBottom: 4,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  separator: { height: 1, backgroundColor: Colors.border, marginLeft: 96 },
  empty: { padding: 24, textAlign: 'center', color: Colors.textSecondary },
});
