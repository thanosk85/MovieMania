import { supabase } from './supabase';

export const IMAGE_BASE = 'https://image.tmdb.org/t/p';

type PosterSource = { id: number; poster_path: string | null; poster_stored?: boolean };

// Προτιμά το poster από το Supabase Storage και πέφτει πίσω στο TMDB αν δεν έχει ανέβει ακόμα.
export function posterUrl(movie: PosterSource, size: 'w185' | 'w500' = 'w500'): string | null {
  if (!movie.poster_path) return null;
  if (movie.poster_stored) {
    return supabase.storage.from('posters').getPublicUrl(`${size}/${movie.id}.jpg`).data.publicUrl;
  }
  return `${IMAGE_BASE}/${size}${movie.poster_path}`;
}
