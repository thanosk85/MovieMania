import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/chip';
import { MovieCard } from '@/components/movie-card';
import { useMovies } from '@/hooks/use-movies';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';

export default function MoviesScreen() {
  const theme = useTheme();
  const { session } = useSession();
  const { movies, summaries, loading, error, reload } = useMovies();
  const [genre, setGenre] = useState<string | null>(null);

  const genres = useMemo(() => {
    const counts = new Map<string, number>();
    movies.forEach((m) => m.genres.forEach((g) => counts.set(g.name, (counts.get(g.name) ?? 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name]) => name);
  }, [movies]);

  const visible = useMemo(
    () => (genre ? movies.filter((m) => m.genres.some((g) => g.name === genre)) : movies),
    [movies, genre],
  );

  const name = session?.user.user_metadata?.full_name?.split(' ')[0] as string | undefined;

  if (loading && movies.length === 0) {
    return (
      <View style={styles.center} accessible accessibilityRole="progressbar" accessibilityLabel="Φόρτωση ταινιών">
        <ActivityIndicator size="large" color={theme.text} />
      </View>
    );
  }

  if (error && movies.length === 0) {
    return (
      <View style={styles.center}>
        <Text accessibilityRole="alert" style={[styles.message, { color: theme.text }]}>
          {error}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={reload}
          style={[styles.button, { backgroundColor: theme.text }]}>
          <Text style={{ color: theme.background, fontWeight: '600' }}>Δοκίμασε ξανά</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      data={visible}
      keyExtractor={(m) => String(m.id)}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      onRefresh={reload}
      refreshing={loading}
      ListHeaderComponent={
        <View style={styles.headerBlock}>
          <Text style={{ color: theme.textSecondary }}>{name ? `Καλησπέρα, ${name}` : 'Καλώς ήρθες'}</Text>
          <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>
            Τώρα στους κινηματογράφους
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip label="Όλες" selected={genre === null} onPress={() => setGenre(null)} />
            {genres.map((g) => (
              <Chip key={g} label={g} selected={genre === g} onPress={() => setGenre(genre === g ? null : g)} />
            ))}
          </ScrollView>
        </View>
      }
      ListEmptyComponent={
        <Text style={[styles.message, { color: theme.textSecondary }]}>
          Δεν υπάρχουν ταινίες. Τρέξε το npm run sync-movies για να γεμίσει η βάση.
        </Text>
      }
      renderItem={({ item, index }) => (
        <MovieCard movie={item} summary={summaries[item.id]} featured={index === 0 && item.in_theaters} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 24, paddingBottom: 24 },
  headerBlock: { gap: 12, paddingTop: 8, paddingBottom: 16 },
  heading: { fontSize: 30, fontWeight: '800' },
  chips: { gap: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  message: { fontSize: 16, textAlign: 'center' },
  button: { minHeight: 48, paddingHorizontal: 24, borderRadius: 24, justifyContent: 'center' },
});
