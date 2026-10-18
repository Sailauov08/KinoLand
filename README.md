# KINO — cinematic movie discovery & watchlist

KINO is a full-stack movie discovery app: featured and trending films, a filterable Top 100, detailed
film pages with cast and official trailers, advanced search, watchlist & favourites, personal
recommendations, an editorial admin area, and a full **English / Русский / Қазақша** interface.

All film data — titles, overviews, ratings, posters, backdrops, cast, directors and trailers — comes
live from **[TMDB](https://www.themoviedb.org/)**. There is no demo or placeholder catalogue: you only
need to add a TMDB key to `.env.local`.

## Quick start

```bash
npm install
cp .env.example .env.local      # then add your TMDB token (see below)
npm run dev                     # http://localhost:3000
```

Requires **Node.js 22.13+ (tested on Node 24)** — the database uses Node's built-in `node:sqlite`,
so there is no native module to compile and no database server to run.

### Connecting TMDB (live data)

1. Create a free account at <https://www.themoviedb.org/signup> and request an API key at
   <https://www.themoviedb.org/settings/api> (choose "Developer", personal/non-commercial use).
2. Copy the **API Read Access Token** (the long v4 token) into `.env.local`:

   ```env
   TMDB_READ_ACCESS_TOKEN=eyJhbGciOi...
   ```

   Alternatively set `TMDB_API_KEY=` to the short v3 key. Only one is needed.
3. Restart `npm run dev`. Real posters, ratings, cast and trailers load everywhere.

**Without a key**, pages show a "Connect TMDB" setup card in development (with the exact line to add)
and the server logs `tmdb.not_configured` once. In a production build, visitors see only a short
"Movies are unavailable right now" message instead of setup details. The admin page always shows the
TMDB connection status.

`.env.local` is gitignored — never commit it. The token is only used server-side; it is never sent to
the browser or written to logs.

### Becoming an administrator

Either list your email before registering (or before your next sign-in):

```env
ADMIN_EMAILS=you@example.com
```

…or promote an existing account:

```bash
npm run admin:promote -- you@example.com
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server on http://localhost:3000 |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | ESLint (Next.js core-web-vitals + TypeScript rules) |
| `npm test` | Vitest unit + integration tests |
| `npm run admin:promote -- <email>` | Grant admin role |

## Features

- **Home** — editorial spotlight hero (admin-chosen, or the week's top trending film), "Picked for you"
  and "Waiting in your watchlist" rails for signed-in users, trending, featured editorial collections,
  highest rated, in cinemas, upcoming, and genre "mood" rails (based on your favourite genres).
- **Top 100** — TMDB's 100 highest-rated films; filter by genre, decade and original language; sort by
  rank, rating, year or title. Filters live in the URL (shareable, back-button friendly).
- **Film pages** — backdrop, poster, overview, tagline, genres, year, runtime, TMDB score & vote
  count, director(s), cast with photos, original title/language, official site / IMDb links, similar
  films, and the **official YouTube trailer** (privacy-enhanced `youtube-nocookie.com` embed that
  loads only after you press play).
- **Search** — title search plus filters for multiple genres, year range, minimum rating, original
  language and sort order. Without a query it uses TMDB Discover with all filters applied server-side.
- **Watchlist & favourites** — optimistic toggles everywhere (cards, hero, film page), library page
  with tabs.
- **Accounts & profiles** — register / sign in / sign out, display name, interface language,
  favourite genres, password change (signs out other sessions), activity stats.
- **Recommendations** — weighted genre affinity (profile genres ×3, favourites ×2, watchlist ×1) over
  TMDB Discover results and TMDB "recommendations" for your saved films; saved titles are excluded.
- **Localisation** — complete en / ru / kk interface dictionaries (type-checked for completeness).
  Locale comes from your choice (cookie, saved on your profile) or the browser's `Accept-Language`.
  Film titles/overviews are requested from TMDB in the same language; Kazakh synopses fall back to
  English when TMDB has none (TMDB has few Kazakh translations).
- **Admin** (`/admin`) — create/edit/delete editorial collections (localised titles & descriptions,
  slug, publish, feature on home, order), add films via TMDB search and reorder them, choose the
  homepage spotlight film with a localised editorial line, and manage user roles (the last admin can't
  be demoted). Admins edit only KINO's own content — TMDB metadata is never modified.

## Architecture

```
src/
  app/                    Next.js App Router pages (server components by default)
    actions/              Server actions: auth, lists, profile, admin (all validated with zod)
    admin/ movie/[id]/ top/ search/ library/ for-you/ profile/ collections/ login/ register/
    error.tsx, global-error.tsx, not-found.tsx, loading.tsx
  components/             UI (header, hero, cards, rails, filters, trailer, forms, admin widgets)
  lib/
    movies/               TMDB client, zod response schemas/mappers, live service, image loader,
                          filters, recommendation scoring, genres
    db/                   node:sqlite connection, migrations, repositories
    auth/                 scrypt password hashing, DB-backed sessions, rate limiting
    i18n/                 locale config, en/ru/kk dictionaries, server helpers
  proxy.ts                Optimistic auth redirect for /admin, /library, /profile
tests/                    Vitest suites
scripts/promote-admin.mjs
```

- **Stack:** Next.js 16 (App Router, Turbopack), React 19, TypeScript strict, Tailwind CSS v4, zod 4,
  SQLite via `node:sqlite`, Vitest.
- **Data flow:** every movie call goes through `lib/movies/service.ts`, which returns
  `{ ok: true, data }` or `{ ok: false, reason: "unconfigured" | "unavailable" }` — never substitute
  content. Pages render a setup/unavailable state, and home-page rails simply hide. TMDB responses are
  cached in the Next.js data cache (1 h for lists, 24 h for details). After a TMDB failure, a 60 s
  circuit breaker fails fast instead of making every page wait on timeouts.
- **Missing fields:** if TMDB has no Russian/Kazakh synopsis, tagline or artwork for a title, the
  English values are used. Titles with no poster get a neutral placeholder, and a missing backdrop
  falls back to the blurred poster or a soft gradient.
- **Images:** `next/image` with a custom loader (`lib/movies/tmdb-image-loader.ts`) maps each srcset
  width to the nearest pre-sized TMDB rendition (`w92`…`w1280`, `original`), served straight from
  TMDB's CDN, so the server never re-encodes images. Broken images swap to the placeholder.
- **Caching model:** `cacheComponents` is disabled on purpose. Every page depends on per-request
  cookies (locale + session), so the classic model with `fetch` revalidation is simpler and correct.
- **Persistence:** `data/kino.db` (gitignored). Tables: users, sessions, list_items, collections,
  collection_items, settings. List/collection rows store a small movie snapshot so they render even
  when TMDB is unreachable; pages refresh them from TMDB in the current language and write the
  fresh data back.
- **Security:** scrypt password hashes, random 256-bit session tokens stored only as SHA-256 hashes,
  httpOnly + SameSite=Lax cookies (Secure in production), login/registration rate limiting,
  constant-time password checks, open-redirect-safe `next` handling, server-side re-authorisation in
  every server action, admin role checks on every admin page/action, zod validation at all
  boundaries, security headers (`X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`,
  `Permissions-Policy`), and structured JSON logs that never include secrets.

## Content & licensing

- Uses the TMDB API under its terms. Attribution is shown in the footer: *"This product uses the TMDB
  API but is not endorsed or certified by TMDB."* Review TMDB's
  [terms of use](https://www.themoviedb.org/api-terms-of-use) before commercial use.
- Trailers are TMDB-listed official YouTube videos embedded via YouTube's player. KINO does not
  host, scrape or stream films.

## Known limitations

- SQLite + in-memory rate limiting and circuit breaker assume a **single server instance**. For
  multi-instance or serverless hosting, move to PostgreSQL and a shared store (e.g. Redis).
- Hosts with an ephemeral filesystem (e.g. Vercel) need a persistent volume or an external database
  for `data/kino.db`.
- Routes with `loading.tsx` stream, so `notFound()`/`redirect()` inside them respond with HTTP 200 +
  the not-found UI (with `noindex`) or a client-side redirect. Private areas also get a real 307 from
  `proxy.ts`.
- No email verification or password-reset email flow (needs an email provider).
- Text search can't be combined with TMDB-side genre/rating filters (a TMDB API limitation). Those
  filters are applied to the matching titles on the current results page, and the UI says so.
