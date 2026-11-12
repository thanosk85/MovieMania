import { MOVIE_COLUMNS, type Movie } from './movies';
import { ensureSession, supabase } from './supabase';

export async function getWatchlist(): Promise<Movie[]> {
  const userId = await ensureSession();
  const { data, error } = await supabase
    .from('watchlist')
    .select(`added_at, movies (${MOVIE_COLUMNS})`)
    .eq('user_id', userId)
    .order('added_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).flatMap((row) => {
    const movie = row.movies as unknown as Movie | null;
    return movie ? [movie] : [];
  });
}

export async function isInWatchlist(movieId: number): Promise<boolean> {
  const userId = await ensureSession();
  const { data, error } = await supabase
    .from('watchlist')
    .select('movie_id')
    .eq('user_id', userId)
    .eq('movie_id', movieId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function setInWatchlist(movieId: number, inList: boolean): Promise<void> {
  const userId = await ensureSession();
  const query = supabase.from('watchlist');
  const { error } = inList
    ? await query.upsert({ user_id: userId, movie_id: movieId }, { onConflict: 'user_id,movie_id' })
    : await query.delete().eq('user_id', userId).eq('movie_id', movieId);
  if (error) throw error;
}
