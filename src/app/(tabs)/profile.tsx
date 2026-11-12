import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SignInPrompt } from '@/components/signin-prompt';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { getMoviesByIds } from '@/lib/movies';
import { getMyRatings, type MyRating } from '@/lib/ratings';
import { supabase } from '@/lib/supabase';
import { getWatchlist } from '@/lib/watchlist';

type Row = MyRating & { title: string };

const dateFormat = new Intl.DateTimeFormat('el-GR', { day: 'numeric', month: 'long', year: 'numeric' });

export default function ProfileScreen() {
  const theme = useTheme();
  const { session, ready } = useSession();
  const userId = session?.user.id;
  const [rows, setRows] = useState<Row[]>([]);
  const [watchlistCount, setWatchlistCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    Promise.all([getMyRatings(), getWatchlist()])
      .then(async ([ratings, list]) => {
        const movies = await getMoviesByIds(ratings.map((r) => r.movie_id));
        const titles = new Map(movies.map((m) => [m.id, m.title]));
        setRows(ratings.map((r) => ({ ...r, title: titles.get(r.movie_id) ?? `Ταινία ${r.movie_id}` })));
        setWatchlistCount(list.length);
      })
      .catch((e) => {
        console.warn(e);
        setError('Δεν ήταν δυνατή η φόρτωση του προφίλ. Δοκίμασε ξανά.');
      })
      .finally(() => setLoading(false));
  }, [userId]);

  useFocusEffect(load);

  if (!ready) return null;
  if (!session) return <SignInPrompt message="Σύνδεση για να δεις το προφίλ και τις βαθμολογίες σου." />;

  const meta = session.user.user_metadata ?? {};
  const name = (meta.full_name as string | undefined) ?? session.user.email ?? 'Χρήστης';
  const since = dateFormat.format(new Date(session.user.created_at));
  const average = rows.length ? (rows.reduce((s, r) => s + r.rating, 0) / rows.length).toFixed(1).replace('.', ',') : '—';

  const stats = [
    { value: String(rows.length), label: 'Ταινίες' },
    { value: average, label: 'Μέσος όρος' },
    { value: String(watchlistCount), label: 'Στη λίστα' },
  ];

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.userRow}>
        <View style={[styles.avatar, { backgroundColor: theme.backgroundElement }]}>
          <Text importantForAccessibility="no" style={{ color: theme.text, fontSize: 24, fontWeight: '700' }}>
            {name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 20, fontWeight: '600' }}>
            {name}
          </Text>
          <Text style={{ color: theme.textSecondary }}>{`Μέλος από ${since}`}</Text>
        </View>
      </View>

      <View style={styles.stats}>
        {stats.map((s) => (
          <View
            key={s.label}
            accessible
            accessibilityLabel={`${s.label}: ${s.value}`}
            style={[styles.stat, { backgroundColor: theme.backgroundElement }]}>
            <Text style={{ color: theme.text, fontSize: 22, fontWeight: '700' }}>{s.value}</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 13 }}>{s.label}</Text>
          </View>
        ))}
      </View>

      <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>
        Οι βαθμολογίες μου
      </Text>

      {loading && rows.length === 0 ? (
        <ActivityIndicator color={theme.text} accessibilityLabel="Φόρτωση βαθμολογιών" />
      ) : error ? (
        <View style={{ gap: 12 }}>
          <Text accessibilityRole="alert" style={{ color: theme.text }}>
            {error}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={load}
            style={[styles.button, { backgroundColor: theme.text }]}>
            <Text style={{ color: theme.background, fontWeight: '600' }}>Δοκίμασε ξανά</Text>
          </Pressable>
        </View>
      ) : rows.length === 0 ? (
        <Text style={{ color: theme.textSecondary }}>Δεν έχεις βαθμολογήσει ακόμα καμία ταινία.</Text>
      ) : (
        rows.map((r) => (
          <Link key={r.movie_id} href={{ pathname: '/movie/[id]', params: { id: r.movie_id } }} asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`${r.title}, βαθμολογία ${r.rating} από 5, ${dateFormat.format(new Date(r.updated_at))}`}
              style={StyleSheet.flatten([styles.rating, { borderBottomColor: theme.backgroundElement }])}>
              <Text style={{ color: theme.text, fontSize: 15, fontWeight: '600', flex: 1 }}>{r.title}</Text>
              <Text style={{ color: theme.accent, fontWeight: '600' }}>{`★ ${r.rating}`}</Text>
            </Pressable>
          </Link>
        ))
      )}

      <Pressable
        accessibilityRole="button"
        onPress={() => supabase.auth.signOut()}
        style={[styles.button, styles.signOut, { borderColor: theme.text }]}>
        <Text style={{ color: theme.text, fontWeight: '600' }}>Αποσύνδεση</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, gap: 16 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 16, gap: 2 },
  rating: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  button: { minHeight: 48, paddingHorizontal: 24, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  signOut: { borderWidth: 1.5, marginTop: 8 },
});
