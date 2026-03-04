# UAE Defence Dashboard

Real-time statistics on Iranian attacks on the UAE — missiles, drones, interceptions — sourced from UAE Ministry of Defence tweets and processed via Claude AI.

## Stack

- **Frontend**: Next.js 16 (App Router), Tailwind CSS v4, Recharts
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL via Vercel Postgres, Prisma 6
- **NLP**: Claude API (classification + entity extraction)
- **Deployment**: Vercel

## Setup

### 1. Environment variables

Copy `.env.local.example` to `.env.local` and fill in real values:

```bash
cp .env.local.example .env.local
```

Required:
- `POSTGRES_PRISMA_URL` — Vercel Postgres pooled connection string
- `POSTGRES_URL_NON_POOLING` — Vercel Postgres direct connection (for migrations)
- `ANTHROPIC_API_KEY` — Claude API key
- `ADMIN_SECRET` — Random 32-char secret for the admin ingestion API

### 2. Install dependencies

```bash
pnpm install
```

### 3. Run database migrations

```bash
pnpm db:migrate
```

This creates the `raw_tweets`, `events` tables and `daily_aggregates` view.

### 4. Start development server

```bash
pnpm dev
```

---

## Scripts

| Command | Description |
|---|---|
| `pnpm ingest` | Interactive CLI to ingest a tweet |
| `pnpm reclassify` | Re-run Claude on flagged / zero-confidence tweets |
| `pnpm reclassify --all` | Re-run Claude on every tweet (use after prompt changes) |
| `pnpm review` | Interactive per-tweet audit (skip / re-run Claude / delete events) |
| `pnpm review --needs-review` | Audit only tweets flagged for manual review |
| `pnpm reconcile` | Compare DB totals against an authoritative MoD tweet and apply corrections |

---

## Ingesting tweets

### CLI (recommended for local use)

```bash
pnpm ingest
```

Interactive prompts:
1. Tweet URL
2. Author handle (e.g. `@UAEMOD_en`)
3. Date (`YYYY-MM-DD`)
4. Tweet text (paste, then type `---` on a new line)

Claude classifies the tweet and extracts daily incident figures (launched / intercepted / impact per threat category). Cumulative totals stated in tweets are ignored — running totals are computed at query time by summing daily events.

### API route (for remote use)

```bash
curl -X POST http://localhost:3000/api/admin/ingest \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: YOUR_ADMIN_SECRET" \
  -d '{
    "tweetUrl": "https://x.com/UAEMOD_en/status/...",
    "tweetText": "...",
    "author": "@UAEMOD_en",
    "tweetDate": "2026-03-04"
  }'
```

Returns `201` with extracted events, or `409` if the tweet URL was already ingested.

---

## Reviewing extractions

```bash
pnpm review              # all tweets
pnpm review --needs-review  # only flagged
```

For each tweet shows: full text, confidence score, extracted events.

Actions:
- `Enter` — skip to next
- `r` — re-run Claude extraction in place
- `d` — delete all extracted events and flag for manual review
- `q` — quit

---

## Reconciliation

Use `pnpm reconcile` to verify DB running totals against an authoritative MoD cumulative statement and optionally apply correction events.

```bash
pnpm reconcile
```

Prompts for the tweet date, URL, and cumulative figures per category (ballistic missiles / cruise missiles / drones × launched / intercepted / impact). Prints a color-coded diff table. If discrepancies are found, offers to insert delta correction events so DB totals match the authoritative source.

Correction events are stored as regular events with a synthetic `rawTweet` record (URL: `correction:reconcile:<date>:<timestamp>`) and a `notes` field documenting the reconciliation source and delta.

---

## Reclassifying after prompt changes

If you update the Claude extraction prompt in `src/lib/claude.ts`, re-run classification on all historical tweets:

```bash
pnpm reclassify --all
```

This deletes and re-inserts extracted events for every tweet. Existing correction events (from `pnpm reconcile`) will also be removed — reconcile again afterwards if needed.

---

## API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/aggregates` | GET | KPI totals + daily breakdown. Params: `from`, `to`, `threat` |
| `/api/tweets` | GET | Paginated source tweets with events. Params: `page`, `limit`, `threat`, `from`, `to`, `needsReview` |
| `/api/events` | GET | Event log with source attribution. Params: `page`, `limit`, `category`, `from`, `to` |
| `/api/admin/ingest` | POST | Ingest a tweet. Header: `x-admin-secret` |

---

## Architecture

```
Manual Tweet Input → CLI / Admin API → Claude AI (classify + extract) → PostgreSQL → Next.js API → Dashboard
```

Every stat on the dashboard links back to the source tweet it was derived from.

---

## Data model

- `raw_tweets` — full tweet text + metadata + Claude classification result
- `events` — extracted daily incidents (category, counts, location) linked to source tweet
- `daily_aggregates` — PostgreSQL view aggregating daily events by date (cumulative totals computed at query time)

### Counting rules

Claude extracts **daily figures only** from each tweet:

| Field | Definition |
|---|---|
| `countLaunched` | Total projectiles fired at UAE in that engagement |
| `countIntercepted` | Destroyed in the air before reaching any surface |
| `countImpact` | Landed inside UAE territory (not at sea) |

Sea-falls (`fell into the sea`) are not counted as impact. They are implicit: `launched − intercepted − impact`.

Tweets that contain only cumulative totals and no daily figures produce `events: []`.

---

## V2 upgrade path

Replace manual ingestion with Twitter API v2 cron polling (11 AM / 11 PM GST):

```typescript
// Planned: scripts/poll-twitter.ts
// GET /2/users/:id/tweets with since_id tracking
// Runs via Vercel Cron / GitHub Actions
```
