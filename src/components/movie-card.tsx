import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { movieMeta, NOT_IN_THEATERS_TEXT, type Movie } from '@/lib/movies';
import type { RatingSummary } from '@/lib/ratings';
import { posterUrl } from '@/lib/tmdb';

export function ratingText(summary?: RatingSummary | null) {
  return summary && summary.count > 0
    ? `Μέσος όρος χρηστών ${summary.average.toString().replace('.', ',')} από 5, ${summary.count} βαθμολογίες`
    : 'Καμία βαθμολογία ακόμα';
}

function shortRating(summary?: RatingSummary | null) {
  return summary && summary.count > 0
    ? `★ ${summary.average.toString().replace('.', ',')} (${summary.count})`
    : 'Χωρίς βαθμολογίες';
}

export function MovieCard({
  movie,
  summary,
  featured = false,
}: {
  movie: Movie;
  summary?: RatingSummary;
  featured?: boolean;
}) {
  const theme = useTheme();
  const year = movie.release_date?.slice(0, 4);
  const poster = posterUrl(movie, featured ? 'w500' : 'w185');
  const meta = movieMeta(movie);
  const label = `${movie.title}${year ? `, ${year}` : ''}. ${
    movie.in_theaters ? '' : `${NOT_IN_THEATERS_TEXT}. `
  }${ratingText(summary)}`;

  const tag = !movie.in_theaters ? (
    <Text style={[styles.tag, { color: theme.text, backgroundColor: theme.backgroundSelected }]}>
      {`⚠ ${NOT_IN_THEATERS_TEXT}`}
    </Text>
  ) : null;

  return (
    <Link href={{ pathname: '/movie/[id]', params: { id: movie.id } }} asChild>
      <Pressable accessibilityRole="link" accessibilityLabel={label}>
        {featured ? (
          <View style={styles.featured}>
            {poster ? (
              <Image source={poster} style={styles.featuredPoster} accessible={false} contentFit="cover" />
            ) : (
              <View style={[styles.featuredPoster, { backgroundColor: theme.backgroundElement }]} />
            )}
            <View style={styles.featuredRow}>
              <Text style={[styles.featuredTitle, { color: theme.text }]} numberOfLines={2}>
                {movie.title}
              </Text>
              <Text style={{ color: theme.accent, fontWeight: '600' }}>{shortRating(summary)}</Text>
            </View>
            {meta ? <Text style={{ color: theme.textSecondary }}>{meta}</Text> : null}
            {tag}
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            {poster ? (
              <Image source={poster} style={styles.poster} accessible={false} contentFit="cover" />
            ) : (
              <View style={[styles.poster, { backgroundColor: theme.backgroundSelected }]} />
            )}
            <View style={styles.info}>
              <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
                {movie.title}
              </Text>
              {year || meta ? (
                <Text style={{ color: theme.textSecondary }}>{[year, meta].filter(Boolean).join(' · ')}</Text>
              ) : null}
              {tag}
              <Text style={{ color: theme.textSecondary }}>{shortRating(summary)}</Text>
            </View>
          </View>
        )}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', borderRadius: 16, overflow: 'hidden', minHeight: 120 },
  poster: { width: 80, height: 120 },
  info: { flex: 1, padding: 12, gap: 4, justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '600' },
  tag: {
    alignSelf: 'flex-start',
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  featured: { gap: 8 },
  featuredPoster: { width: '100%', height: 300, borderRadius: 20 },
  featuredRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  featuredTitle: { flex: 1, fontSize: 20, fontWeight: '600' },
});
