import { ensureSession, supabase } from './supabase';

export type RatingSummary = { average: number; count: number };

export async function getSummaries(): Promise<Record<number, RatingSummary>> {
  const { data, error } = await supabase.from('movie_rating_summary').select('movie_id, average, count');
  if (error) throw error;
  return Object.fromEntries(
    (data ?? []).map((r) => [r.movie_id as number, { average: Number(r.average), count: Number(r.count) }]),
  );
}

export async function getSummary(movieId: number): Promise<RatingSummary | null> {
  const { data, error } = await supabase
    .from('movie_rating_summary')
    .select('average, count')
    .eq('movie_id', movieId)
    .maybeSingle();
  if (error) throw error;
  return data ? { average: Number(data.average), count: Number(data.count) } : null;
}

export async function getMyRating(movieId: number): Promise<number | null> {
  const userId = await ensureSession();
  const { data, error } = await supabase
    .from('ratings')
    .select('rating')
    .eq('movie_id', movieId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.rating ?? null;
}

export type MyRating = { movie_id: number; rating: number; updated_at: string };

export async function getMyRatings(): Promise<MyRating[]> {
  const userId = await ensureSession();
  const { data, error } = await supabase
    .from('ratings')
    .select('movie_id, rating, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as MyRating[];
}

export async function setMyRating(movieId: number, rating: number): Promise<void> {
  const userId = await ensureSession();
  const { error } = await supabase
    .from('ratings')
    .upsert({ movie_id: movieId, user_id: userId, rating }, { onConflict: 'movie_id,user_id' });
  if (error) throw error;
}
