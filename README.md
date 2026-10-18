# KinoLand — cinematic movie discovery, watchlists & admin dashboard

KinoLand is a full-stack movie discovery app: trending and top-rated films, a filterable Top 100,
detailed film pages with cast and official trailers, advanced search, watchlist & favourites,
personal recommendations, a full **English / Русский / Қазақша** interface, and a secure
**administration dashboard** with first-party analytics.

All film data — titles, overviews, ratings, posters, backdrops, cast, directors, trailers — comes live
from **[TMDB](https://www.themoviedb.org/)**. There is no demo catalogue.

## Quick start

```bash
npm install
cp .env.example .env.local      # add your TMDB credential
npm run dev                     # http://localhost:3000
```

Requires **Node.js 22.13+ (tested on Node 24)**. The database is **PostgreSQL**. In production
that's **Supabase** (`DATABASE_URL`). Locally, with `DATABASE_URL` empty, KinoLand runs an embedded
Postgres (PGlite) in `data/pglite`, so development needs no database server. The schema migrates
automatically on first use; you can also run `npm run db:migrate`.

### Environment variables (names only)

| Variable | Required | Purpose |
| --- | --- | --- |
| `TMDB_READ_ACCESS_TOKEN` **or** `TMDB_API_KEY` | yes | TMDB API credential (get it at <https://www.themoviedb.org/settings/api>) |
| `NEXT_PUBLIC_SITE_URL` | production | Base URL for Open Graph links |
| `POSTHOG_PROJECT_API_KEY`, `POSTHOG_HOST` | optional | Forward consented events to PostHog (server-side) |
| `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID` | optional | Show PostHog numbers in `/admin/analytics` (server-only) |
| `DATABASE_URL` | production | Supabase Postgres connection string (Transaction pooler, port 6543) |
| `DATABASE_CA_CERT` | optional | Supabase CA certificate (PEM) to verify the DB server certificate |
| `APP_TIMEZONE` | optional | Time zone for daily statistics (default `Asia/Almaty`) |

## Administrator access

The dashboard is at **`/admin`**. There is **no public admin sign-up** and no hard-coded admin
password. Roles are stored in the database and checked server-side on every admin page, API and
action.

1. Register normally in the app (all new accounts are regular users).
2. On the server, designate the first administrator once:

   ```bash
   npm run admin:promote -- you@example.com
   ```

3. After that, admins can grant or revoke the role in **Admin → Users → Details**. The last active
   admin can't be demoted or suspended, and admins can't act on their own account.

### Dashboard sections

| Page | What it shows / does |
| --- | --- |
| Overview | Registered users, new today/this week, visitors, page views, movie views, searches, watchlist interactions, user-growth/visits/interaction charts, most viewed films, recent errors. Date range: 7d/30d/90d/12m |
| Users | Search, role/status filters, sorting, pagination; account details; suspend/reactivate (revokes all sessions) and role changes, each behind a confirmation dialog |
| Analytics | Visits, unique visitors, top pages, events by type; PostHog numbers when configured |
| Movies | Most viewed pages, popular genres, watchlist/favourite additions, frequently searched, trending interest, trailer/provider availability, playback starts/errors, quick "hide" |
| Search analytics | Totals, text vs filter searches, zero-result rate, top queries, queries without results |
| Watchlists | Aggregate list statistics (individual lists stay private) |
| Content | Homepage banners (localized editorial lines, rotate daily), movie visibility overrides, approved "Where to watch" provider links (https only), homepage section toggles |
| System health | Database, TMDB API and server status, configured integrations (names only), operational warnings, error trend and recent errors |
| Settings | Admin bootstrap instructions, analytics retention + purge, environment status, audit log |

Every figure is labelled with its source (**KinoLand database**, **first-party analytics** or
**PostHog**). Nothing is estimated. Empty periods show zeros or an explanation.

Admin JSON APIs (`GET /api/admin/overview`, `GET /api/admin/users`) return **401** without a
session, **403** for non-admins and **429** when rate-limited. They never return password hashes or
tokens.

## Analytics & privacy

- **First-party analytics (always on, cookieless):** page views, movie views, searches, watchlist and
  favourite changes, sign-ups, logins, playback starts/errors. No IP addresses are stored; unique
  visitors use a SHA-256 hash with a random salt that rotates daily and is then deleted. Query strings
  are stripped from paths, and search text that looks like an email, phone number or URL is never
  stored. Bots are ignored. Retention is configurable (default 180 days).
- **PostHog (optional):** with `POSTHOG_PROJECT_API_KEY` set, a consent prompt appears. Only after
  "Allow" are the same events forwarded **from the server** with a random consent-scoped id (never an
  email or account id). No PostHog script runs in the browser, and session recording is never enabled.

Tracked events: `page_view`, `movie_view`, `movie_search`, `watchlist_add`, `watchlist_remove`,
`favorite_add`, `favorite_remove`, `signup_success`, `login_success`, `playback_started`,
`playback_error`.

## Database (PostgreSQL / Supabase)

All tables live in the private **`kinoland`** schema. Supabase's public Data API only exposes
`public`, and every table also has **Row Level Security enabled with no policies**, so the anon key
can read nothing. The app connects server-side with `DATABASE_URL`. No Supabase client library or
service-role key is used or exposed.

| Table | Purpose |
| --- | --- |
| `users` | Accounts: id, email, display name, scrypt password hash, role, status, preferences, timestamps |
| `sessions` | Server-side sessions (only SHA-256 hashes of tokens) |
| `list_items` | Per-user watchlist and favourites (with a TMDB snapshot) |
| `events` | First-party analytics events |
| `daily_salts` | Today's visitor-hash salt (older salts deleted) |
| `error_log` | Server/client errors for the health dashboard |
| `audit_log` | Sensitive admin actions |
| `rate_limits` | Login/registration throttling shared across serverless instances |
| `banners`, `hidden_movies`, `provider_links`, `settings` | KinoLand-owned editorial content and settings |
| `schema_migrations` | Applied migration versions |

Schema: `src/lib/db/schema.ts`. Connection: `src/lib/db/index.ts`.

### Moving existing local data to Supabase

The previous version stored data in SQLite (`data/kino.db`). To copy accounts (with their existing
password hashes), lists, settings, banners and analytics into Supabase:

```bash
# with DATABASE_URL set in .env.local
npm run db:import-sqlite
```

The import is idempotent, and synthetic test accounts (`@kino.test`, `@kinoland.test`) are skipped
unless you pass `--include-test-accounts`.

To inspect users safely (no hashes), use **Admin → Users**, or the Supabase Table Editor (schema
`kinoland`). Avoid exporting the `password_hash` column.

## Deploy: GitHub → Vercel + Supabase

1. **Supabase:** create a project (the free tier is enough to start). In **Connect**, copy the
   **Transaction pooler** URI (port 6543), insert your database password and append
   `?sslmode=require`.
2. **Schema and data:** put that URI in `.env.local` as `DATABASE_URL`, then run
   `npm run db:migrate` and, if you're moving old data, `npm run db:import-sqlite`.
3. **GitHub:** push this repository.
4. **Vercel:** *Add New → Project → Import* the GitHub repo (framework auto-detected: Next.js). Under
   **Environment Variables** add `TMDB_API_KEY` (or `TMDB_READ_ACCESS_TOKEN`), `DATABASE_URL`,
   `NEXT_PUBLIC_SITE_URL` (your Vercel URL), optionally `APP_TIMEZONE` and the PostHog variables,
   then deploy.
5. **First admin:** register on the live site, then run locally (with the production `DATABASE_URL`):
   `npm run admin:promote -- you@example.com`.

The app uses node-postgres (`pg`), which sends one query per connection at a time. That matters
because Supabase's transaction pooler stalls on pipelined queries.

Notes: in-memory caches (TMDB circuit breaker, hidden-movie cache, analytics event rate limit) are
per serverless instance, which is fine for this use. Login and registration limits are stored in
Postgres.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | TypeScript strict check |
| `npm run lint` | ESLint |
| `npm test` | Vitest suites (run against an in-memory Postgres) |
| `npm run db:migrate` | Create/update the schema in `DATABASE_URL` (or the local embedded DB) |
| `npm run db:import-sqlite` | Copy data from the old `data/kino.db` SQLite file |
| `npm run admin:promote -- <email>` | One-time server-side admin bootstrap |

## Architecture

```
src/
  app/                 Pages (public + /admin), server actions, API routes (/api/events, /api/admin/*)
  components/          Public UI, admin UI (shell, charts, forms), analytics client
  lib/
    admin/             Dashboard queries, date ranges, health checks, PostHog query client
    analytics/         Privacy rules (sanitize) and server-side tracking/forwarding
    auth/              scrypt passwords, DB sessions, rate limiting, admin API guard
    db/                Postgres connection (node-postgres / PGlite), schema, repositories
    i18n/              en/ru/kk dictionaries (public + admin)
    movies/            TMDB client, schemas, live service, image loader
  proxy.ts             Fast 307 to /login for /admin, /library, /profile without a session
```

## Content & licensing

- Uses the TMDB API under its terms. The official TMDB logo and the notice *"KinoLand uses TMDB and
  the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB."* appear in the footer
  on every page; full credits are on `/about`.
- Trailers are official YouTube videos listed on TMDB. "Where to watch" links point only to
  admin-approved https pages of legitimate services. KinoLand never hosts or streams films.

## Known limitations

- No email verification or password reset by email (needs an email provider).
- Routes with streaming loading states return HTTP 200 with a not-found page or client redirect.
  Private areas also get a real 307 from `proxy.ts`.
- PostHog numbers in the dashboard need a personal API key, and PostHog only receives consented
  visitors, so it reports less than first-party analytics.
