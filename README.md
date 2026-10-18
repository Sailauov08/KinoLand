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

Requires **Node.js 22.13+ (tested on Node 24)**. The database is SQLite via Node's built-in
`node:sqlite`, so there's nothing to compile and no database server to run. The schema migrates
automatically on first start.

### Environment variables (names only)

| Variable | Required | Purpose |
| --- | --- | --- |
| `TMDB_READ_ACCESS_TOKEN` **or** `TMDB_API_KEY` | yes | TMDB API credential (get it at <https://www.themoviedb.org/settings/api>) |
| `NEXT_PUBLIC_SITE_URL` | production | Base URL for Open Graph links |
| `POSTHOG_PROJECT_API_KEY`, `POSTHOG_HOST` | optional | Forward consented events to PostHog (server-side) |
| `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID` | optional | Show PostHog numbers in `/admin/analytics` (server-only) |
| `DATABASE_PATH` | optional | SQLite file location (default `data/kino.db`) |

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

## Database

SQLite file `data/kino.db` (gitignored, persistent across restarts). Migrations live in
`src/lib/db/migrations.ts` and are additive; v1 data is preserved. A pre-upgrade backup was written
to `data/backups/`.

| Table | Purpose |
| --- | --- |
| `users` | Accounts: id, email, display name, scrypt password hash, role, status, preferences, timestamps |
| `sessions` | Server-side sessions (only SHA-256 hashes of tokens) |
| `list_items` | Per-user watchlist and favourites (with a TMDB snapshot) |
| `events` | First-party analytics events |
| `daily_salts` | Today's visitor-hash salt (older salts deleted) |
| `error_log` | Server/client errors for the health dashboard |
| `audit_log` | Sensitive admin actions |
| `banners`, `hidden_movies`, `provider_links`, `settings` | KinoLand-owned editorial content and settings |
| `collections`, `collection_items` | Retired feature; kept only to preserve existing data |

To inspect users safely (no hashes), use **Admin → Users**, or run read-only:

```bash
node -e "const d=new (require('node:sqlite').DatabaseSync)('data/kino.db',{readOnly:true});console.table(d.prepare('SELECT id,name,role,status,created_at FROM users').all())"
```

**Deployment note:** SQLite on local disk suits a single long-running server (VPS, Docker with a
volume, Railway/Fly with a persistent volume). Serverless hosts like Vercel have an ephemeral
filesystem, so they'd need a hosted database (e.g. PostgreSQL) instead. That would be a separate
migration of `src/lib/db/*`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | TypeScript strict check |
| `npm run lint` | ESLint |
| `npm test` | Vitest suites (unit, DB migration, authorization, analytics privacy) |
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
    db/                node:sqlite connection, migrations, repositories
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

- Single-instance storage (SQLite, in-memory rate limits). See the deployment note.
- No email verification or password reset by email (needs an email provider).
- Routes with streaming loading states return HTTP 200 with a not-found page or client redirect.
  Private areas also get a real 307 from `proxy.ts`.
- PostHog numbers in the dashboard need a personal API key, and PostHog only receives consented
  visitors, so it reports less than first-party analytics.
