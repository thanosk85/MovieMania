import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { MovieCard } from '@/components/movie-card';
import { SignInPrompt } from '@/components/signin-prompt';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import type { Movie } from '@/lib/movies';
import { getSummaries, type RatingSummary } from '@/lib/ratings';
import { getWatchlist } from '@/lib/watchlist';

export default function WatchlistScreen() {
  const theme = useTheme();
  const { session, ready } = useSession();
  const userId = session?.user.id;
  const [movies, setMovies] = useState<Movie[]>([]);
  const [summaries, setSummaries] = useState<Record<number, RatingSummary>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    Promise.all([getWatchlist(), getSummaries().catch(() => ({}))])
      .then(([list, sums]) => {
        setMovies(list);
        setSummaries(sums);
      })
      .catch((e) => {
        console.warn(e);
        setError('Δεν ήταν δυνατή η φόρτωση της λίστας. Δοκίμασε ξανά.');
      })
      .finally(() => setLoading(false));
  }, [userId]);

  useFocusEffect(load);

  if (!ready) return null;
  if (!userId) return <SignInPrompt message="Σύνδεση για να βλέπεις τη λίστα με τις ταινίες που θέλεις να δεις." />;

  if (error && movies.length === 0) {
    return (
      <View style={styles.center}>
        <Text accessibilityRole="alert" style={[styles.message, { color: theme.text }]}>
          {error}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={load}
          style={[styles.button, { backgroundColor: theme.text }]}>
          <Text style={{ color: theme.background, fontWeight: '600' }}>Δοκίμασε ξανά</Text>
        </Pressable>
      </View>
    );
  }

  if (loading && movies.length === 0) {
    return (
      <View style={styles.center} accessible accessibilityRole="progressbar" accessibilityLabel="Φόρτωση λίστας">
        <ActivityIndicator size="large" color={theme.text} />
      </View>
    );
  }

  return (
    <FlatList
      data={movies}
      keyExtractor={(m) => String(m.id)}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      onRefresh={load}
      refreshing={loading}
      ListHeaderComponent={
        <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>
          Η λίστα μου
        </Text>
      }
      ListEmptyComponent={
        <Text style={[styles.message, { color: theme.textSecondary }]}>
          Η λίστα σου είναι άδεια. Πρόσθεσε ταινίες από τη σελίδα τους.
        </Text>
      }
      renderItem={({ item }) => <MovieCard movie={item} summary={summaries[item.id]} />}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 24, paddingBottom: 24 },
  heading: { fontSize: 30, fontWeight: '800', paddingTop: 8, paddingBottom: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  message: { fontSize: 16, textAlign: 'center' },
  button: { minHeight: 48, paddingHorizontal: 24, borderRadius: 24, justifyContent: 'center' },
});
