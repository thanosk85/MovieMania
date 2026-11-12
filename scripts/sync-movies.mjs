// Συγχρονίζει τις ταινίες που παίζουν στους κινηματογράφους από το TMDB στο Supabase.
// Τρέξιμο: npm run sync-movies
// Απαιτεί στο .env: EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (μυστικό, ΟΧΙ EXPO_PUBLIC_), TMDB_API_KEY ή EXPO_PUBLIC_TMDB_API_KEY
import { createClient } from '@supabase/supabase-js';

const TMDB = 'https://api.themoviedb.org/3';
const TMDB_KEY = process.env.TMDB_API_KEY ?? process.env.EXPO_PUBLIC_TMDB_API_KEY;
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAX_PAGES = 10;
const CONCURRENCY = 5;
const BUCKET = 'posters';
const POSTER_SIZES = ['w185', 'w500'];

for (const [name, value] of Object.entries({
  TMDB_API_KEY: TMDB_KEY,
  EXPO_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
})) {
  if (!value) {
    console.error(`Λείπει η μεταβλητή ${name} από το .env`);
    process.exit(1);
  }
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function tmdb(path, params = {}) {
  const query = new URLSearchParams({ api_key: TMDB_KEY, language: 'el-GR', ...params });
  const res = await fetch(`${TMDB}${path}?${query}`);
  if (!res.ok) throw new Error(`TMDB ${path} -> ${res.status}`);
  return res.json();
}

async function nowPlayingIds() {
  const ids = new Set();
  let total = 1;
  for (let page = 1; page <= Math.min(total, MAX_PAGES); page++) {
    const data = await tmdb('/movie/now_playing', { region: 'GR', page: String(page) });
    total = data.total_pages;
    data.results.forEach((m) => ids.add(m.id));
  }
  return [...ids];
}

function toRow(d, now) {
  return {
    id: d.id,
    title: d.title,
    original_title: d.original_title,
    overview: d.overview,
    tagline: d.tagline || null,
    poster_path: d.poster_path,
    backdrop_path: d.backdrop_path,
    release_date: d.release_date || null,
    runtime: d.runtime || null,
    genres: d.genres ?? [],
    vote_average: d.vote_average,
    vote_count: d.vote_count,
    original_language: d.original_language,
    details: d,
    in_theaters: true,
    left_theaters_at: null,
    last_seen_in_theaters_at: now,
    synced_at: now,
  };
}

async function ensureBucket() {
  const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
  if (error && !/already exists/i.test(error.message)) throw error;
}

// Ανεβάζει το poster σε κάθε μέγεθος στο Storage. Επιστρέφει true αν ανέβηκαν όλα.
async function uploadPoster(id, posterPath) {
  try {
    for (const size of POSTER_SIZES) {
      const res = await fetch(`https://image.tmdb.org/t/p/${size}${posterPath}`);
      if (!res.ok) throw new Error(`poster ${id} ${size} -> ${res.status}`);
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(`${size}/${id}.jpg`, await res.arrayBuffer(), { contentType: 'image/jpeg', upsert: true });
      if (error) throw error;
    }
    return true;
  } catch (e) {
    console.error(e.message);
    return false;
  }
}

async function main() {
  await ensureBucket();
  const ids = await nowPlayingIds();
  // Αν το API επιστρέψει κενή λίστα, δεν σημαίνει ότι έφυγαν όλες οι ταινίες.
  if (ids.length === 0) throw new Error('Το TMDB επέστρεψε κενή λίστα, ο συγχρονισμός ακυρώθηκε');
  console.log(`Βρέθηκαν ${ids.length} ταινίες στους κινηματογράφους`);

  const now = new Date().toISOString();
  const failed = [];
  let upserted = 0;

  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const batchIds = ids.slice(i, i + CONCURRENCY);
    const { data: existing, error: existingError } = await supabase
      .from('movies')
      .select('id, poster_path, poster_stored')
      .in('id', batchIds);
    if (existingError) throw existingError;
    const known = new Map((existing ?? []).map((m) => [m.id, m]));

    const rows = await Promise.all(
      batchIds.map(async (id) => {
        try {
          const d = await tmdb(`/movie/${id}`, {
            append_to_response: 'credits,videos,release_dates',
            include_video_language: 'el,en,null',
          });
          const row = toRow(d, now);
          const prev = known.get(id);
          // Ξανα-ανεβάζουμε μόνο αν το poster άλλαξε ή δεν έχει αποθηκευτεί ακόμα.
          row.poster_stored = !d.poster_path
            ? false
            : prev?.poster_stored && prev.poster_path === d.poster_path
              ? true
              : await uploadPoster(id, d.poster_path);
          return row;
        } catch (e) {
          console.error(e.message);
          failed.push(id);
          return null;
        }
      }),
    );
    const valid = rows.filter(Boolean);
    if (valid.length) {
      const { error } = await supabase.from('movies').upsert(valid);
      if (error) throw error;
      upserted += valid.length;
    }
  }

  // Ταινίες που ήταν στους κινηματογράφους και δεν είναι πια στη λίστα του TMDB (όχι όσες απέτυχαν να φορτωθούν).
  const { data: gone, error } = await supabase
    .from('movies')
    .update({ in_theaters: false, left_theaters_at: now })
    .eq('in_theaters', true)
    .not('id', 'in', `(${ids.join(',')})`)
    .select('id, title');
  if (error) throw error;

  console.log(`Αποθηκεύτηκαν/ενημερώθηκαν: ${upserted}`);
  if (failed.length) console.warn(`Απέτυχαν (θα ξαναδοκιμαστούν στο επόμενο τρέξιμο): ${failed.join(', ')}`);
  for (const m of gone ?? []) console.log(`Δεν προβάλλεται πια: ${m.title} (${m.id})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
