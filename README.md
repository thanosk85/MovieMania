# MovieMania

MovieMania is a cross-platform mobile app (Android, iOS and web) for browsing the films currently showing in Greek cinemas. Users can view movie details, rate movies from 1 to 5 stars, see the community's average rating, and keep a personal watchlist. The user interface is in Greek.

The app is built with [Expo](https://expo.dev) (SDK 58), React Native and [Expo Router](https://docs.expo.dev/router/introduction/). Movie data comes from [TMDB](https://www.themoviedb.org/) and is stored in [Supabase](https://supabase.com), which also provides Google sign-in.

## Features

- **Now playing:** films currently in Greek cinemas (TMDB region `GR`, language `el-GR`). Films that left cinemas in the last 30 days stay visible with a notice.
- **Search:** filter by title, or show only top-rated films (average rating of 4 or higher).
- **Movie details:** poster, overview, genres, runtime and the community rating.
- **Ratings:** signed-in users rate films from 1 to 5 stars.
- **Watchlist:** signed-in users save films to watch later.
- **Profile:** the user's ratings, average rating and watchlist count.
- **Sign-in:** Google OAuth through Supabase Auth (PKCE flow).

## How it works

```text
TMDB API ──(npm run sync-movies)──► Supabase (movies table + "posters" storage bucket)
                                          ▲
                        Expo app ─────────┘  reads movies, reads/writes ratings and watchlist
```

The app does not call TMDB directly. A Node.js script ([scripts/sync-movies.mjs](scripts/sync-movies.mjs)) fetches the films now playing, saves them to the `movies` table and uploads their posters to Supabase Storage. **You must run this script at least once, or the app will show no movies.**

## Requirements

### Software

| Requirement | Version / notes |
| --- | --- |
| [Node.js](https://nodejs.org/) | `^22.13.0`, `^24.3.0` or `>=26.0.0` (required by Expo SDK 58 and React Native 0.88). An LTS release is recommended. |
| npm | Included with Node.js. The project uses `package-lock.json`. |
| [Git](https://git-scm.com/) | To clone the repository. |

To run the app, you also need at least one of the following:

- **A physical device** with [Expo Go](https://expo.dev/go) or a [development build](https://docs.expo.dev/develop/development-builds/introduction/) installed. During the SDK 58 transition period, [Expo Go on physical devices may only support SDK 57](https://docs.expo.dev/get-started/create-a-project/). If Expo Go reports an incompatible SDK, create a development build with `npx expo run:android` or `npx expo run:ios`, or in the cloud with `npx eas-cli@latest build --profile development`.
- **An Android emulator:** [Android Studio](https://docs.expo.dev/workflow/android-studio-emulator/) with JDK 17.
- **An iOS simulator:** macOS with [Xcode](https://docs.expo.dev/workflow/ios-simulator/).
- **A web browser:** run the app with `npm run web`.

### Accounts and services

| Service | What you need |
| --- | --- |
| [Supabase](https://supabase.com) (free tier is enough) | A project, its **Project URL**, its **anon/publishable key** and its **service role key**. |
| [TMDB](https://www.themoviedb.org/settings/api) | A free **API key (v3)**. The v4 read access token does not work with the sync script. |
| [Google Cloud](https://console.cloud.google.com/) | An OAuth 2.0 Client ID (Web application) for Google sign-in. |

## Setup

### 1. Clone the repository and install dependencies

```bash
git clone https://github.com/thanosk85/MovieMania.git
cd MovieMania
npm install
```

### 2. Set up the Supabase database

In the Supabase dashboard, open **SQL Editor** and run these files in this order:

1. [supabase/movies.sql](supabase/movies.sql): the `movies` table and its read policy.
2. [supabase/schema.sql](supabase/schema.sql): the `ratings` table, its policies and the `movie_rating_summary` view.
3. [supabase/watchlist.sql](supabase/watchlist.sql): the `watchlist` table and its policies. It depends on `movies`.

You do not need to create the public `posters` storage bucket. The sync script creates it on its first run.

### 3. Set up Google sign-in

1. In Google Cloud Console, create an OAuth 2.0 Client ID of type **Web application**. Add `https://<your-project-ref>.supabase.co/auth/v1/callback` as an authorized redirect URI.
2. In Supabase, go to **Authentication → Sign In / Providers → Google**. Enable it and enter the Client ID and Client Secret.
3. In Supabase, go to **Authentication → URL Configuration** and add the app's redirect URLs to **Redirect URLs**:
   - Expo Go: `exp://**` (the app uses `exp://<dev-server-host>/--/login`)
   - Development and production builds: `myapp://login`
   - Web (development): `http://localhost:8081/**`

### 4. Configure environment variables

Copy [.env.example](.env.example) to `.env` in the project root and fill in your values. The `.env` file is listed in `.gitignore`, so it will not be committed.

```bash
# macOS/Linux
cp .env.example .env
# Windows (PowerShell)
Copy-Item .env.example .env
```

The file contains the following variables:

```dotenv
# Used by the app (bundled into the client; safe to expose)
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=<your-supabase-anon-or-publishable-key>

# Used only by the sync script (never prefix these with EXPO_PUBLIC_)
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
TMDB_API_KEY=<your-tmdb-v3-api-key>
```

| Variable | Used by | Description |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | App and sync script | Supabase Project URL. |
| `EXPO_PUBLIC_SUPABASE_KEY` | App | Supabase anon/publishable key. Row Level Security protects user data. |
| `SUPABASE_SERVICE_ROLE_KEY` | Sync script | **Secret.** It bypasses Row Level Security. Never commit it, share it or expose it to the app. |
| `TMDB_API_KEY` | Sync script | TMDB v3 API key. The script also accepts `EXPO_PUBLIC_TMDB_API_KEY`. |

### 5. Load the movie data

```bash
npm run sync-movies
```

This command fetches up to 10 pages of now-playing films from TMDB, adds or updates them in Supabase and uploads their posters. It also marks films that are no longer showing as out of theatres. Run it again whenever you want to refresh the data.

### 6. Start the app

```bash
npm start
```

Then do one of the following:

- Scan the QR code with Expo Go on Android, or with the Camera app on iOS.
- Press `a` to open the app on an Android emulator, `i` to open it on an iOS simulator or `w` to open it in a browser.

You can also start a specific platform directly with `npm run android`, `npm run ios` or `npm run web`.

## Optional: automatic daily sync on Windows

[scripts/register-sync-movies-task.ps1](scripts/register-sync-movies-task.ps1) registers a Windows scheduled task named `SyncMovies`. The task runs [scripts/sync-movies-daily.mjs](scripts/sync-movies-daily.mjs) when you log on, and it syncs at most once per day.

```powershell
# Register the task
powershell -ExecutionPolicy Bypass -File scripts\register-sync-movies-task.ps1

# Run a sync now, even if one already ran today
node scripts\sync-movies-daily.mjs --force

# Remove the task
Unregister-ScheduledTask -TaskName SyncMovies -Confirm:$false
```

Logs are written to `%LOCALAPPDATA%\sync-movies\sync-movies.log`.

## Available scripts

| Command | Description |
| --- | --- |
| `npm start` | Start the Expo development server. |
| `npm run android` | Start the server and open the app on Android. |
| `npm run ios` | Start the server and open the app on iOS (requires macOS). |
| `npm run web` | Start the server and open the app in a web browser. |
| `npm run lint` | Run ESLint (`expo lint`). |
| `npm run sync-movies` | Sync now-playing films from TMDB to Supabase. |
| `npx tsc --noEmit` | Type-check the project. |

> **Warning:** Do not run `npm run reset-project`. It comes from the Expo starter template and moves or **deletes** the `src/` and `scripts/` directories, which removes the app.

## Project structure

```text
src/
  app/                  Screens (Expo Router file-based routing)
    (tabs)/             Tab screens: movies, search, watchlist, profile
    movie/[id].tsx      Movie details, rating and watchlist actions
    login.tsx           Google sign-in
  components/           Reusable UI components
  constants/theme.ts    Colours and theme
  hooks/                Session, movies and theme hooks
  lib/                  Supabase client and data access (movies, ratings, watchlist, posters)
scripts/                Movie sync scripts and the Windows scheduled-task helper
supabase/               SQL for tables, views and Row Level Security policies
assets/                 Icons, splash screen and images
app.json                Expo app configuration
```

## Troubleshooting

- **No movies appear:** run `npm run sync-movies` and check that it finishes without errors. Check that `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY` are set correctly in `.env`.
- **Changes to `.env` have no effect:** restart the development server with `npx expo start --clear`.
- **Google sign-in fails or does not return to the app:** check that the redirect URLs in step 3 are in Supabase **Redirect URLs**, and that the Google provider is enabled.
- **The sync script reports a missing variable:** check that `.env` is in the project root and contains all the variables listed above.
- **Dependency version warnings:** run `npx expo-doctor`, then run `npx expo install --fix`.

## Acknowledgements

This product uses the TMDB API but is not endorsed or certified by TMDB.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
