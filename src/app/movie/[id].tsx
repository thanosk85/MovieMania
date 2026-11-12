import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ratingText } from '@/components/movie-card';
import { StarRating } from '@/components/star-rating';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { getMovie, movieMeta, NOT_IN_THEATERS_TEXT, type Movie } from '@/lib/movies';
import { getMyRating, getSummary, setMyRating, type RatingSummary } from '@/lib/ratings';
import { supabaseConfigured } from '@/lib/supabase';
import { posterUrl } from '@/lib/tmdb';
import { isInWatchlist, setInWatchlist } from '@/lib/watchlist';

const dateFormat = new Intl.DateTimeFormat('el-GR', { day: 'numeric', month: 'short', year: 'numeric' });

export default function MovieScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const movieId = Number(id);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [mine, setMine] = useState<number | null>(null);
  const [summary, setSummary] = useState<RatingSummary | null>(null);
  const [inList, setInList] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { session } = useSession();
  const userId = session?.user.id;

  const load = useCallback(() => {
    getMovie(movieId)
      .then(setMovie)
      .catch((e) => {
        console.warn(e);
        setError('Δεν ήταν δυνατή η φόρτωση της ταινίας. Δοκίμασε ξανά.');
      });
    if (supabaseConfigured) {
      getSummary(movieId).then(setSummary).catch(() => {});
    }
  }, [movieId]);

  useEffect(load, [load]);

  useEffect(() => {
    if (supabaseConfigured && userId) {
      getMyRating(movieId).then(setMine).catch(() => {});
      isInWatchlist(movieId).then(setInList).catch(() => {});
    }
  }, [movieId, userId]);

  function announce(message: string) {
    setStatus(message);
    AccessibilityInfo.announceForAccessibility(message);
  }

  async function rate(value: number) {
    if (saving) return;
    setSaving(true);
    setStatus(null);
    let message: string;
    try {
      await setMyRating(movieId, value);
      setMine(value);
      setSummary(await getSummary(movieId));
      message = `Η βαθμολογία σου αποθηκεύτηκε: ${value} από 5`;
    } catch {
      message = 'Αποτυχία αποθήκευσης. Δοκίμασε ξανά.';
    } finally {
      setSaving(false);
    }
    announce(message);
  }

  async function toggleWatchlist() {
    if (saving) return;
    setSaving(true);
    const next = !inList;
    let message: string;
    try {
      await setInWatchlist(movieId, next);
      setInList(next);
      message = next ? 'Προστέθηκε στη λίστα σου' : 'Αφαιρέθηκε από τη λίστα σου';
    } catch {
      message = 'Αποτυχία ενημέρωσης της λίστας. Δοκίμασε ξανά.';
    } finally {
      setSaving(false);
    }
    announce(message);
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text accessibilityRole="alert" style={{ color: theme.text, textAlign: 'center' }}>
          {error}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setError(null);
            load();
          }}
          style={[styles.button, { backgroundColor: theme.text }]}>
          <Text style={{ color: theme.background, fontWeight: '600' }}>Δοκίμασε ξανά</Text>
        </Pressable>
      </View>
    );
  }
  if (!movie) {
    return (
      <View style={styles.center} accessible accessibilityRole="progressbar" accessibilityLabel="Φόρτωση ταινίας">
        <ActivityIndicator size="large" color={theme.text} />
      </View>
    );
  }

  const poster = posterUrl(movie);
  const meta = [
    movieMeta(movie),
    movie.release_date ? dateFormat.format(new Date(movie.release_date)) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}>
      <Stack.Screen options={{ title: movie.title }} />
      {poster ? (
        <Image source={poster} style={styles.poster} contentFit="cover" accessible={false} />
      ) : null}
      <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
        {movie.title}
      </Text>
      {meta ? <Text style={[styles.centered, { color: theme.textSecondary }]}>{meta}</Text> : null}
      {!movie.in_theaters ? (
        <View
          accessible
          accessibilityRole="alert"
          style={[styles.notice, { backgroundColor: theme.backgroundSelected }]}>
          <Text style={[styles.noticeText, { color: theme.text }]}>{`⚠ ${NOT_IN_THEATERS_TEXT}`}</Text>
        </View>
      ) : null}
      <Text style={[styles.body, { color: theme.text }]}>
        {movie.overview || 'Δεν υπάρχει διαθέσιμη περιγραφή.'}
      </Text>

      <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>
        Βαθμολογία
      </Text>
      <Text style={[styles.centered, { color: theme.textSecondary }]}>{ratingText(summary)}</Text>

      {!supabaseConfigured ? (
        <Text style={{ color: theme.text }}>
          Η βαθμολόγηση δεν είναι διαθέσιμη: λείπει η ρύθμιση του Supabase.
        </Text>
      ) : !userId ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/login')}
          style={[styles.button, { backgroundColor: theme.text }]}>
          <Text style={{ color: theme.background, fontWeight: '600' }}>Σύνδεση για να βαθμολογήσεις</Text>
        </Pressable>
      ) : (
        <>
          <StarRating value={mine} onChange={rate} disabled={saving} />
          <Text style={[styles.centered, { color: theme.text }]}>
            {status ?? (mine ? `Η βαθμολογία σου: ${mine} από 5` : 'Δεν έχεις βαθμολογήσει ακόμα')}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: saving }}
            onPress={toggleWatchlist}
            style={[
              styles.button,
              inList
                ? { borderWidth: 1.5, borderColor: theme.text }
                : { backgroundColor: theme.text },
            ]}>
            <Text style={{ color: inList ? theme.text : theme.background, fontWeight: '600' }}>
              {inList ? 'Αφαίρεση από τη λίστα' : 'Προσθήκη στη λίστα'}
            </Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, gap: 12, alignItems: 'stretch' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  button: { minHeight: 52, paddingHorizontal: 24, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  poster: { width: 180, height: 270, borderRadius: 20, alignSelf: 'center', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center' },
  centered: { textAlign: 'center' },
  heading: { fontSize: 20, fontWeight: '600', marginTop: 8, textAlign: 'center' },
  body: { fontSize: 16, lineHeight: 24 },
  notice: { padding: 12, borderRadius: 12 },
  noticeText: { fontSize: 16, fontWeight: '600' },
});
