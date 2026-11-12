import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Chip } from '@/components/chip';
import { MovieCard } from '@/components/movie-card';
import { useMovies } from '@/hooks/use-movies';
import { useTheme } from '@/hooks/use-theme';

const RECENT_KEY = 'recent-searches';
const MAX_RECENT = 5;

const normalize = (s: string) =>
  s
    .toLocaleLowerCase('el-GR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export default function SearchScreen() {
  const theme = useTheme();
  const { movies, summaries } = useMovies();
  const [query, setQuery] = useState('');
  const [topRated, setTopRated] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(RECENT_KEY)
      .then((v) => v && setRecent(JSON.parse(v)))
      .catch(() => {});
  }, []);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    return movies.filter((m) => {
      const matchesText = !q || normalize([m.title, ...m.genres.map((g) => g.name)].join(' ')).includes(q);
      const matchesRating = !topRated || (summaries[m.id]?.average ?? 0) >= 4;
      return matchesText && matchesRating;
    });
  }, [movies, summaries, query, topRated]);

  function remember() {
    const q = query.trim();
    if (!q) return;
    const next = [q, ...recent.filter((r) => r !== q)].slice(0, MAX_RECENT);
    setRecent(next);
    AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => {});
  }

  const searching = query.trim().length > 0 || topRated;

  return (
    <FlatList
      data={searching ? results : []}
      keyExtractor={(m) => String(m.id)}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      ListHeaderComponent={
        <View style={styles.headerBlock}>
          <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>
            Αναζήτηση
          </Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={remember}
            returnKeyType="search"
            accessibilityLabel="Αναζήτηση ταινίας"
            placeholder="Τίτλος ή είδος"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
          />
          <View style={styles.chips}>
            <Chip label="Βαθμολογία 4+" selected={topRated} onPress={() => setTopRated(!topRated)} />
          </View>
          {!searching && recent.length > 0 ? (
            <View style={{ gap: 4 }}>
              <Text accessibilityRole="header" style={{ color: theme.textSecondary, fontWeight: '600' }}>
                Πρόσφατες αναζητήσεις
              </Text>
              {recent.map((r) => (
                <Pressable key={r} accessibilityRole="button" onPress={() => setQuery(r)} style={styles.recent}>
                  <Text style={{ color: theme.text, fontSize: 16 }}>{r}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        searching ? (
          <Text accessibilityRole="alert" style={[styles.message, { color: theme.textSecondary }]}>
            Δεν βρέθηκαν ταινίες.
          </Text>
        ) : undefined
      }
      renderItem={({ item }) => <MovieCard movie={item} summary={summaries[item.id]} />}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 24, paddingBottom: 24 },
  headerBlock: { gap: 12, paddingTop: 8, paddingBottom: 16 },
  heading: { fontSize: 30, fontWeight: '800' },
  input: { minHeight: 52, borderRadius: 26, paddingHorizontal: 20, fontSize: 16 },
  chips: { flexDirection: 'row', gap: 8 },
  recent: { minHeight: 48, justifyContent: 'center' },
  message: { fontSize: 16, textAlign: 'center', paddingTop: 16 },
});
