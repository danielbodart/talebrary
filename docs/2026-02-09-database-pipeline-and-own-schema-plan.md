---
title: Database Pipeline & Own Schema
date: 2026-02-09
author: Daniel Bodart
type: plan
status: complete
tags: [database, pipeline, schema, d1, ifdb]
last_updated: 2026-02-09
---

# Database Pipeline & Own Schema

## Overview

Replace the current one-time IFDB database import with an automated quarterly sync pipeline and our own curated `talebrary_*` schema. The system should be fully self-contained — if IFDB disappeared tomorrow, the app continues working with existing data.

## Previous State (Before Migration)

### Data Source
- IFDB publishes quarterly MySQL dumps as `ifdb-archive-YYYYMMDD.zip` at `https://ifarchive.org/if-archive/info/ifdb/`
- Schedule: ~1st of Mar/Jun/Sep/Dec (quarterly)
- Format: ZIP containing MariaDB 10.5.15 dump (~30MB compressed, ~80MB uncompressed)
- Contains 42 tables; we used 4: `games`, `gamelinks`, `filetypes`, `reviews` + FTS5 `games_search`

### Old Pipeline (Manual)
```
ifdb-archive.sql (MySQL)
  → db/mysql2sqlite (AWK) → full.sql (SQLite)
  → sqlite3 → talebrary.sqlite
  → .dump → d1.sql (stripped of transactions)
  → wrangler d1 execute → Cloudflare D1
```

### Problems (All Resolved)
1. ~~Database is ~18 months stale — no mechanism to update~~ → Automated sync pipeline
2. ~~We use someone else's schema with ~80% unused data~~ → Own `talebrary_*` schema (23MB vs 74MB)
3. ~~No way to curate games (enable/disable, annotate, boost)~~ → `enabled` + `notes` fields
4. ~~No way to record our own data (transcripts, game state, custom ratings)~~ → Schema supports future tables
5. ~~If IFDB changes their schema, everything breaks~~ → Sync layer insulates app from IFDB

---

## Desired End State

### Architecture
```
                         QUARTERLY SYNC
                              |
IF Archive ZIP ──→ Download ──→ Extract ──→ MySQL dump
                                                |
                                     mysql2sqlite (existing AWK)
                                                |
                                          ifdb.sqlite (temporary)
                                                |
                                     ┌──────────┴──────────┐
                                     │      sync.sql        │
                                     │                      │
                                     │  INSERT new games    │
                                     │  UPDATE changed data │
                                     │  Preserve curation   │
                                     │  Materialise links   │
                                     │  Compute avg_rating  │
                                     │  Rebuild FTS5        │
                                     │  Data cleansing      │
                                     └──────────┬──────────┘
                                                |
                                       talebrary.sqlite
                                     (fully self-contained)
                                                |
                                     ┌──────────┴──────────┐
                                     │                      │
                                Bun local dev         D1 upload
```

### Runtime Tables (all `talebrary_*`)

No IFDB tables exist at runtime. Everything the app needs is materialised into our schema.

**`talebrary_games`** — Game metadata + curation:
```sql
CREATE TABLE talebrary_games (
    id TEXT PRIMARY KEY,               -- IFDB game ID
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    description TEXT,                   -- cleaned from IFDB 'desc'
    genre TEXT,
    language TEXT,
    published TEXT,                     -- ISO date
    coverart TEXT,                      -- URL
    tags TEXT,
    seriesname TEXT,
    avg_rating REAL,                    -- materialised from reviews
    -- Curation
    enabled INTEGER NOT NULL DEFAULT 1, -- 0 = hidden from all queries
    notes TEXT,                          -- admin notes
    -- Sync tracking
    ifdb_moddate TEXT,                  -- IFDB's modification date
    synced_at TEXT                      -- when we last synced this row
);
```

**`talebrary_gamelinks`** — Denormalised story file links:
```sql
CREATE TABLE talebrary_gamelinks (
    game_id TEXT NOT NULL,
    url TEXT NOT NULL,
    format TEXT NOT NULL,               -- e.g. 'zcode', 'glulx', 'tads3'
    extension TEXT,                     -- e.g. '.z5 .z8', '.ulx'
    display_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (game_id, url)
);
```

**`talebrary_search`** — FTS5 index:
```sql
CREATE VIRTUAL TABLE talebrary_search USING fts5(
    id, title, author, tags, description, seriesname, genre
);
```

### Key Properties
- **Self-contained**: App works with zero IFDB tables present
- **Curation survives sync**: `enabled`, `notes` are never overwritten by sync
- **New games auto-appear**: Quarterly sync INSERTs new games with `enabled=1`
- **Changed data propagates**: Sync UPDATEs IFDB-sourced fields when upstream changes
- **Deletions are safe**: Games removed from IFDB stay in our database
- **Data quality**: Sync step can cleanse data (strip HTML, normalise languages, etc.)

---

## Sync Logic

### sync.sql

```sql
-- Assumes: ifdb.sqlite is ATTACHed as 'ifdb' with original IFDB tables

-- 1. Insert new games (not yet in talebrary)
INSERT INTO talebrary_games (
    id, title, author, description, genre, language, published,
    coverart, tags, seriesname, ifdb_moddate, synced_at
)
SELECT
    g.id, g.title, g.author, g.desc, g.genre, g.language, g.published,
    g.coverart, g.tags, g.seriesname, g.moddate, datetime('now')
FROM ifdb.games g
WHERE NOT EXISTS (SELECT 1 FROM talebrary_games t WHERE t.id = g.id);

-- 2. Update existing games where IFDB data has changed
-- Preserves: enabled, notes (curation fields)
UPDATE talebrary_games SET
    title = ig.title,
    author = ig.author,
    description = ig.desc,
    genre = ig.genre,
    language = ig.language,
    published = ig.published,
    coverart = ig.coverart,
    tags = ig.tags,
    seriesname = ig.seriesname,
    ifdb_moddate = ig.moddate,
    synced_at = datetime('now')
FROM ifdb.games ig
WHERE talebrary_games.id = ig.id
  AND (talebrary_games.ifdb_moddate IS NULL
       OR ig.moddate > talebrary_games.ifdb_moddate);

-- 3. Materialise avg_rating from reviews
UPDATE talebrary_games SET avg_rating = (
    SELECT AVG(r.rating) FROM ifdb.reviews r WHERE r.gameid = talebrary_games.id
)
WHERE EXISTS (SELECT 1 FROM ifdb.reviews r WHERE r.gameid = talebrary_games.id);

-- 4. Rebuild gamelinks (full replace — IFDB owns this data)
DELETE FROM talebrary_gamelinks;
INSERT INTO talebrary_gamelinks (game_id, url, format, extension, display_order)
SELECT l.gameid, l.url, f.externid, f.extension, l.displayorder
FROM ifdb.gamelinks l
JOIN ifdb.filetypes f ON l.fmtid = f.id
WHERE l.gameid IN (SELECT id FROM talebrary_games);

-- 5. Rebuild FTS5 search index (only enabled games)
DELETE FROM talebrary_search;
INSERT INTO talebrary_search (id, title, author, tags, description, seriesname, genre)
SELECT id, title, author, tags, description, seriesname, genre
FROM talebrary_games
WHERE enabled = 1;
```

### Curation Preservation Rules
| Field | On INSERT | On UPDATE (IFDB changed) | On UPDATE (curation) |
|-------|-----------|-------------------------|---------------------|
| title, author, etc. | From IFDB | Overwritten with IFDB | N/A |
| enabled | Default 1 | **Preserved** | Manual edit |
| notes | NULL | **Preserved** | Manual edit |
| avg_rating | Computed | Recomputed | N/A |

---

## Pipeline Commands (Implemented)

All commands are in `db/run` — see the file for current source. Summary:

| Command | Purpose |
|---------|---------|
| `./db/run download` | Download latest quarterly IFDB archive ZIP, extract to `ifdb-archive.sql` |
| `./db/run convert-ifdb` | MySQL → SQLite via `mysql2sqlite`, creates `ifdb.sqlite` |
| `./db/run sync` | ATTACH `ifdb.sqlite`, run `sync.sql` into `talebrary.sqlite` |
| `./db/run upload` | `.dump` talebrary.sqlite → strip transactions → upload to D1 |
| `./db/run pipeline` | All of the above in sequence |
| `./db/run migrate` | One-time migration via `migrate-run.ts` (already executed) |

Root `./run` additions: `db-sync` → `./db/run pipeline`, `db-download` → `./db/run download`

---

## GitHub Actions Workflow

### `.github/workflows/db-sync.yml`

```yaml
name: Database Sync

on:
  # Quarterly: 8th of Jan/Apr/Jul/Oct (week after IFDB's typical ~1st publish)
  schedule:
    - cron: '0 2 8 1,4,7,10 *'
  # Manual trigger
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/cache@v4
        with:
          path: tools
          key: mise-tools-${{ hashFiles('mise.toml') }}

      - name: Download and convert IFDB
        run: |
          ./db/run download
          ./db/run convert-ifdb

      - name: Sync into talebrary schema
        run: ./db/run sync

      - name: Upload to D1
        run: ./db/run upload
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

      - name: Commit updated source dump
        run: |
          git config user.name "github-actions"
          git config user.email "actions@github.com"
          git add db/ifdb-archive.sql
          git diff --staged --quiet || git commit -m "chore: update IFDB archive ($(date +%Y-%m-%d))"
          git push
        continue-on-error: true
```

---

## SqlGameFinder Changes

### Before → After table mappings

| Before | After |
|--------|-------|
| `games g` | `talebrary_games g` |
| `g.desc AS description` | `g.description` |
| `games_search` | `talebrary_search` |
| `gamelinks l JOIN filetypes f ON l.fmtid = f.id` | `talebrary_gamelinks l` |
| `l.gameid` | `l.game_id` |
| `f.externid` | `l.format` |
| `f.extension` | `l.extension` |
| `l.displayorder` | `l.display_order` |
| `reviews r` | (removed — use `g.avg_rating` directly) |

### Simplified Playable Subquery

```sql
-- Before (complex join):
(SELECT CASE WHEN count(*) > 0 THEN 1 ELSE 0 END
    FROM gamelinks l JOIN filetypes f ON l.fmtid = f.id
    WHERE l.gameid = g.id
      AND f.externid IN ('zcode', 'blorb/zcode', ...)
      AND (' ' || f.extension || ' ' LIKE ...)
      AND l.url NOT LIKE '%.z6')

-- After (denormalised):
(SELECT CASE WHEN count(*) > 0 THEN 1 ELSE 0 END
    FROM talebrary_gamelinks l
    WHERE l.game_id = g.id
      AND l.format IN ('zcode', 'blorb/zcode', ...)
      AND (' ' || l.extension || ' ' LIKE ...)
      AND l.url NOT LIKE '%.z6')
```

### Simplified Rating

```sql
-- Before (CTE with reviews join):
game_reviews AS (
    SELECT g.id, avg(r.rating) AS rating
    FROM filtered_games g JOIN reviews r ON g.id = r.gameid
    GROUP BY g.id
)
...
JOIN game_reviews gr USING (id)

-- After (direct column):
-- Remove game_reviews CTE entirely
-- Use g.avg_rating directly in SELECT and ORDER BY
-- Games without reviews: COALESCE(g.avg_rating, 0)
```

### Enabled Filter

Add `AND g.enabled = 1` to all `filtered_games` CTEs and to `get()`.

### Full Example: `find()`

```sql
WITH ranks AS (
    SELECT g.id, 0 as rank
    FROM talebrary_games g
    WHERE ?1 = '' AND g.enabled = 1
    UNION
    SELECT s.id, abs(bm25(talebrary_search, 1, 2, 2)) AS rank
    FROM talebrary_search s
    WHERE ?1 <> '' AND talebrary_search = ?1
),
filtered_games AS (
    SELECT g.id,
           r.rank,
           CASE WHEN lower(g.title) = lower(?1) THEN 3 ELSE 0 END AS boost,
           g.title,
           g.author,
           g.description,
           COALESCE(g.avg_rating, 0) AS rating,
           ${playableSubquery} AS playable
    FROM ranks r JOIN talebrary_games g ON g.id = r.id
    WHERE g.enabled = 1
    ${langWhere}
)
SELECT fg.id,
       fg.rating,
       fg.rank,
       fg.boost,
       fg.rank + fg.boost + fg.rating AS score,
       fg.title,
       fg.author,
       fg.description,
       fg.playable
FROM filtered_games fg
WHERE fg.playable = 1
ORDER BY score DESC
LIMIT 20;
```

Note: The `game_reviews` CTE is eliminated entirely. Simpler queries, fewer joins.

### Full Example: `get()`

```sql
SELECT g.id, g.title, g.author, g.description, l.url, l.format AS type, g.coverart
FROM talebrary_games g
JOIN talebrary_gamelinks l ON g.id = l.game_id
WHERE g.id = ? AND g.enabled = 1
  AND l.format IN ('zcode', 'blorb/zcode', ...)
  AND (' ' || l.extension || ' ' LIKE ...)
  AND l.url NOT LIKE '%.z6'
ORDER BY l.display_order ASC
LIMIT 1
```

---

## Migration (Completed)

### What Was Done

**Commit `4d582f2`** — Code changes:
- Created `db/schema/talebrary.sql` (CREATE TABLE IF NOT EXISTS for all three tables)
- Created `db/sync.sql` (incremental sync logic with ATTACH DATABASE)
- Created `db/migrate.sql` (one-time migration from IFDB → talebrary schema)
- Added `db/run` commands: `download`, `convert-ifdb`, `sync`, `upload`, `pipeline`
- Updated `src/games/SqlGameFinder.ts` (new table names, simplified queries, removed reviews CTE)
- Updated tests for new schema

**D1 Migration** — Executed 2025-02-09:
- Pre-migration bookmark: `00000649-00000000-0000500d-636b11e2eb8929085ba2411292f547ce`
- D1 **cannot execute large multi-statement files** — the single `migrate.sql` failed with `D1_RESET_DO` error
- Had to split into 4 sequential steps (see D1 Constraints below)
- Final state: 12,987 games, 19,376 links, 12,987 search entries
- DB size: 74MB (old IFDB) → 23MB (talebrary schema + FTS5)

### D1 Constraints (Learned the Hard Way)

1. **No `time-travel bookmark create`** — only `time-travel info` (get current bookmark) and `time-travel restore` (restore to bookmark)
2. **No `VACUUM`** — not supported on D1 remote databases
3. **Complex multi-statement batches fail** — D1's Durable Object resets (`D1_RESET_DO`) when a single file contains too many heterogeneous operations (CREATE + INSERT...SELECT + DROP + CREATE VIRTUAL TABLE). Simple homogeneous batches (e.g. 44 DROP statements) work fine.
4. **Split strategy**: Separate files executed sequentially, one concern per file:
   - `migrate-1-create.sql` — CREATE TABLE statements
   - `migrate-2-copy-data.sql` — INSERT...SELECT data migration
   - `migrate-3-drop-old.sql` — DROP TABLE cleanup
   - `migrate-4-search-index.sql` — CREATE VIRTUAL TABLE + FTS5 population

### D1 Upload Strategy for Sync Pipeline

The `upload()` function in `db/run` dumps `talebrary.sqlite` via `.dump` and uploads the whole thing. This produces simple CREATE/INSERT statements (not complex cross-table operations), so it should work for D1's file upload mechanism. If it hits size limits in future, apply the same split strategy: separate schema creation from data insertion.

### Rollback

```bash
bunx wrangler d1 time-travel restore talebrary --bookmark=00000649-00000000-0000500d-636b11e2eb8929085ba2411292f547ce
git checkout HEAD -- src/games/SqlGameFinder.ts
./run deploy
```

---

## Data Cleansing Opportunities

These can be added to `sync.sql` incrementally:

1. **Strip HTML from descriptions**: Many IFDB descriptions contain raw HTML tags
2. **Normalise language codes**: `en, es` → could split into rows or standardise
3. **Validate coverart URLs**: Some may be broken/expired
4. **Pre-compute playability**: Add `playable` boolean column to `talebrary_games`, computed during sync based on gamelinks + supported formats — would eliminate the correlated subquery at runtime
5. **Deduplicate gamelinks**: Some games have duplicate links with different filetypes pointing to the same URL

---

## Future Features Enabled

| Feature | How |
|---------|-----|
| Game curation | `UPDATE talebrary_games SET enabled = 0, notes = 'Crashes' WHERE id = ?` |
| Transcript recording | New `talebrary_transcripts` table alongside |
| LLM game knowledge | Build from transcripts: game-specific context for how to play |
| Custom collections | New `talebrary_collections` + `talebrary_collection_items` |
| Manual game additions | `INSERT INTO talebrary_games` with `ifdb_moddate = NULL` |
| Admin UI | REST API over `talebrary_*` tables (future) |

---

## Build Sequence

1. ~~Create `db/schema/talebrary.sql`~~ — Done (commit `4d582f2`)
2. ~~Create `db/sync.sql`~~ — Done (commit `4d582f2`)
3. ~~Create `db/migrate.sql`~~ — Done (commit `4d582f2`)
4. ~~Update `db/run` with new commands~~ — Done (commit `4d582f2`)
5. ~~Update `src/games/SqlGameFinder.ts`~~ — Done (commit `4d582f2`)
6. ~~Update tests~~ — Done (commit `4d582f2`)
7. ~~Run migration locally + full test suite~~ — Done
8. ~~Take D1 backup, run migration on D1~~ — Done (split into 4 steps, see Migration section)
9. Deploy — **TODO**
10. Create `.github/workflows/db-sync.yml` — **TODO**
11. Test with manual workflow dispatch — **TODO**
12. Remove old `db/drop.sql`, `db/fulltext.sql` — **TODO** (check if they still exist)
13. Update `CLAUDE.md` with new pipeline docs — **TODO**

---

## Open Questions

1. **Should we check `talebrary.sqlite` into the repo?** It's needed for local dev. Currently `talebrary.sqlite` is ~50MB. Could use Git LFS, or have developers run `./db/run pipeline` to bootstrap locally.
2. **D1 import downtime**: Import blocks the database. Migration took ~2s total across 4 steps. Quarterly sync upload (full `.dump`) may take longer — worth monitoring on first real sync.
3. **Should the cron job also commit `talebrary.sqlite`?** Would keep the repo's local dev database fresh, but adds binary churn.
4. ~~**Data cleansing scope for v1**: Start with none (just schema migration) or include basic cleansing (strip HTML descriptions)?~~ — Decided: none for v1, can add to `sync.sql` incrementally.
5. **D1 upload splitting**: The `upload()` function dumps the whole DB into one file. If this fails on D1 (like the migration did), we'll need to split the dump into schema + data batches. Monitor on first real sync run.
