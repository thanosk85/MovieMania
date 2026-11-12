import { supabase } from './supabase';

export type Movie = {
  id: number;
  title: string;
  overview: string | null;
  tagline: string | null;
  poster_path: string | null;
  poster_stored: boolean;
  backdrop_path: string | null;
  release_date: string | null;
  runtime: number | null;
  genres: { id: number; name: string }[];
  in_theaters: boolean;
  left_theaters_at: string | null;
};

export const MOVIE_COLUMNS =
  'id, title, overview, tagline, poster_path, poster_stored, backdrop_path, release_date, runtime, genres, in_theaters, left_theaters_at';

// Ταινίες που έφυγαν πρόσφατα εμφανίζονται με ένδειξη, ώστε όσοι τις βαθμολόγησαν να ενημερώνονται.
const RECENTLY_LEFT_DAYS = 30;

export async function getMovies(): Promise<Movie[]> {
  const since = new Date(Date.now() - RECENTLY_LEFT_DAYS * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from('movies')
    .select(MOVIE_COLUMNS)
    .or(`in_theaters.eq.true,left_theaters_at.gte.${since}`)
    .order('in_theaters', { ascending: false })
    .order('release_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Movie[];
}

export async function getMovie(id: number): Promise<Movie> {
  const { data, error } = await supabase.from('movies').select(MOVIE_COLUMNS).eq('id', id).single();
  if (error) throw error;
  return data as unknown as Movie;
}

export async function getMoviesByIds(ids: number[]): Promise<Movie[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from('movies').select(MOVIE_COLUMNS).in('id', ids);
  if (error) throw error;
  return (data ?? []) as unknown as Movie[];
}

export function formatRuntime(minutes: number | null): string | null {
  return minutes ? `${Math.floor(minutes / 60)}ω ${String(minutes % 60).padStart(2, '0')}λ` : null;
}

export function movieMeta(movie: Movie): string {
  return [movie.genres[0]?.name, formatRuntime(movie.runtime)].filter(Boolean).join(' · ');
}

export const NOT_IN_THEATERS_TEXT = 'Δεν προβάλλεται πλέον στους κινηματογράφους';
