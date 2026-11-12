import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { getMovies, type Movie } from '@/lib/movies';
import { getSummaries, type RatingSummary } from '@/lib/ratings';

export function useMovies() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [summaries, setSummaries] = useState<Record<number, RatingSummary>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMovies(await getMovies());
      setSummaries(await getSummaries().catch(() => ({})));
    } catch (e) {
      console.warn(e);
      setError('Δεν ήταν δυνατή η φόρτωση των ταινιών. Έλεγξε τη σύνδεσή σου και δοκίμασε ξανά.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return { movies, summaries, loading, error, reload: load };
}
