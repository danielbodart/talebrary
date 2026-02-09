# Database Pipeline & Own Schema

## Overview

Replace the current one-time IFDB database import with an automated quarterly sync pipeline and our own curated `talebrary_*` schema. The system should be fully self-contained — if IFDB disappeared tomorrow, the app continues working with existing data.

## Current State

### Data Source
- IFDB publishes quarterly MySQL dumps as `ifdb-archive-YYYYMMDD.zip` at `https://ifarchive.org/if-archive/info/ifdb/`
- Schedule: ~1st of Mar/Jun/Sep/Dec (quarterly)
- Format: ZIP containing MariaDB 10.5.15 dump (~30MB compressed, ~80MB uncompressed)
- Contains 42 tables; we use 4: `games`, `gamelinks`, `filetypes`, `reviews` + FTS5 `games_search`

### Current Pipeline (Manual)
```
ifdb-archive.sql (MySQL)
  → db/mysql2sqlite (AWK) → full.sql (SQLite)
  → sqlite3 → talebrary.sqlite
  → .dump → d1.sql (stripped of transactions)
  → wrangler d1 execute → Cloudflare D1
```

### What the App Actually Uses
| Table | Columns Used | Purpose |
|-------|-------------|---------|
| `games` | id, title, author, desc, genre, language, published, coverart, tags, seriesname | Game metadata |
| `gamelinks` | gameid, url, fmtid, displayorder | Story file URLs |
| `filetypes` | id, externid, extension | Format definitions |
| `reviews` | gameid, rating | Average ratings |
| `games_search` | FTS5(id, title, author, tags, desc, seriesname, genre) | Full-text search |

### Problems
1. Database is ~18 months stale — no mechanism to update
2. We use someone else's schema with ~80% unused data
3. No way to curate games (enable/disable, annotate, boost)
4. No way to record our own data (transcripts, game state, custom ratings)
5. If IFDB changes their schema, everything breaks

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

## Pipeline Commands

### `db/run` additions

```bash
function download() {
    # Try current quarter's dump, then previous quarter
    local year=$(date +%Y)
    local month=$(date +%m)
    # Map to quarter start: 03, 06, 09, 12
    local qmonth=$(( ((${month#0} - 1) / 3) * 3 + 3 ))
    local qmonth_padded=$(printf "%02d" $qmonth)
    local filename="ifdb-archive-${year}${qmonth_padded}01.zip"
    local url="https://ifarchive.org/if-archive/info/ifdb/${filename}"

    echo "Downloading: $url"
    if ! curl -f -o "$SCRIPT_DIR/ifdb-latest.zip" "$url"; then
        # Try previous quarter
        if [ "$qmonth" -eq 3 ]; then
            year=$((year - 1)); qmonth=12
        else
            qmonth=$((qmonth - 3))
        fi
        qmonth_padded=$(printf "%02d" $qmonth)
        filename="ifdb-archive-${year}${qmonth_padded}01.zip"
        url="https://ifarchive.org/if-archive/info/ifdb/${filename}"
        echo "Trying previous quarter: $url"
        curl -f -o "$SCRIPT_DIR/ifdb-latest.zip" "$url"
    fi

    unzip -o "$SCRIPT_DIR/ifdb-latest.zip" -d "$SCRIPT_DIR/"
    # The ZIP contains a single .sql file
    mv "$SCRIPT_DIR"/ifdb-archive-*.sql "$SCRIPT_DIR/ifdb-archive.sql"
    rm "$SCRIPT_DIR/ifdb-latest.zip"
}

function convert-ifdb() {
    pushd "$SCRIPT_DIR"
    echo "Converting IFDB MySQL dump to SQLite..."
    rm -f ifdb.sqlite full-ifdb.sql
    ./mysql2sqlite ifdb-archive.sql > full-ifdb.sql
    sqlite3 ifdb.sqlite < full-ifdb.sql
    echo "IFDB SQLite created: $(sqlite3 ifdb.sqlite 'SELECT COUNT(*) FROM games;') games"
    popd
}

function sync() {
    pushd "$SCRIPT_DIR"
    echo "Syncing IFDB → talebrary..."

    # Ensure talebrary schema exists
    sqlite3 talebrary.sqlite < schema/talebrary.sql

    # Attach IFDB and run sync
    sqlite3 talebrary.sqlite <<EOF
ATTACH DATABASE 'ifdb.sqlite' AS ifdb;
.read sync.sql
DETACH DATABASE ifdb;
EOF

    local total=$(sqlite3 talebrary.sqlite "SELECT COUNT(*) FROM talebrary_games;")
    local enabled=$(sqlite3 talebrary.sqlite "SELECT COUNT(*) FROM talebrary_games WHERE enabled = 1;")
    local links=$(sqlite3 talebrary.sqlite "SELECT COUNT(*) FROM talebrary_gamelinks;")
    echo "Sync complete: $total games ($enabled enabled), $links links"
    popd
}

function upload() {
    . "$SCRIPT_DIR/../commands.sh"
    pushd "$SCRIPT_DIR"
    sqlite3 talebrary.sqlite .dump > d1.sql
    sed -i '/^BEGIN TRANSACTION;$/d; /^COMMIT;$/d' d1.sql
    echo "Uploading to D1..."
    wrangler d1 execute talebrary --remote --file="$SCRIPT_DIR/d1.sql"
    echo "D1 upload complete."
    popd
}

function pipeline() {
    download
    convert-ifdb
    sync
    upload
}
```

### Root `./run` additions

```bash
function db-sync() {
    ./db/run pipeline
}

function db-download() {
    ./db/run download
}
```

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

## Migration Plan (Big Bang)

### Pre-requisites
- Take D1 Time Travel bookmark: `wrangler d1 time-travel bookmark create talebrary --tag pre-migration`

### Step 1: Create Schema Files

Create `db/schema/talebrary.sql` with `CREATE TABLE IF NOT EXISTS` for all three tables.

### Step 2: Create Migration Script

`db/migrate.sql`:
```sql
-- One-time migration from old schema to new schema
-- Run locally and on D1

-- Create talebrary schema (IF NOT EXISTS for safety)
-- [contents of schema/talebrary.sql]

-- Migrate games
INSERT INTO talebrary_games (
    id, title, author, description, genre, language, published,
    coverart, tags, seriesname, avg_rating, enabled, synced_at
)
SELECT
    g.id, g.title, g.author, g.desc, g.genre, g.language, g.published,
    g.coverart, g.tags, g.seriesname,
    (SELECT AVG(r.rating) FROM reviews r WHERE r.gameid = g.id),
    1,  -- enabled
    datetime('now')
FROM games g;

-- Migrate gamelinks (denormalise with filetypes)
INSERT INTO talebrary_gamelinks (game_id, url, format, extension, display_order)
SELECT l.gameid, l.url, f.externid, f.extension, l.displayorder
FROM gamelinks l
JOIN filetypes f ON l.fmtid = f.id;

-- Build FTS5 index
INSERT INTO talebrary_search (id, title, author, tags, description, seriesname, genre)
SELECT id, title, author, tags, description, seriesname, genre
FROM talebrary_games
WHERE enabled = 1;

-- Drop old tables
DROP TABLE IF EXISTS games_search;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS gamelinks;
DROP TABLE IF EXISTS filetypes;
DROP TABLE IF EXISTS games;
-- Plus all unused tables from drop.sql
```

### Step 3: Update SqlGameFinder.ts

Apply all query changes described above.

### Step 4: Update Tests

Update `GameFinderContract.test.ts` and `D1GameFinder.test.ts` to use new table names and include `enabled` field in test fixtures.

### Step 5: Execute Migration

```bash
# Locally
sqlite3 db/talebrary.sqlite < db/migrate.sql
./run check
./run test

# D1
wrangler d1 execute talebrary --remote --file=db/migrate.sql
./run deploy
```

### Step 6: Verify

```bash
# Check D1
wrangler d1 execute talebrary --remote --command="SELECT COUNT(*) FROM talebrary_games;"
wrangler d1 execute talebrary --remote --command="SELECT COUNT(*) FROM talebrary_gamelinks;"

# Test production
curl -s https://talebrary.com/catalogue/genres/fantasy | grep -c 'card'
```

### Rollback

```bash
wrangler d1 time-travel restore talebrary --tag pre-migration
# Revert SqlGameFinder.ts
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

1. Create `db/schema/talebrary.sql`
2. Create `db/sync.sql`
3. Create `db/migrate.sql`
4. Update `db/run` with new commands
5. Update `src/games/SqlGameFinder.ts`
6. Update tests
7. Run migration locally + full test suite
8. Take D1 backup, run migration on D1
9. Deploy
10. Create `.github/workflows/db-sync.yml`
11. Test with manual workflow dispatch
12. Remove old `db/drop.sql`, `db/fulltext.sql`
13. Update `CLAUDE.md` with new pipeline docs

---

## Open Questions

1. **Should we check `talebrary.sqlite` into the repo?** It's needed for local dev. Currently `talebrary.sqlite` is ~50MB. Could use Git LFS, or have developers run `./db/run pipeline` to bootstrap locally.
2. **D1 import downtime**: Import blocks the database. For ~50MB SQL this is probably seconds, but worth monitoring.
3. **Should the cron job also commit `talebrary.sqlite`?** Would keep the repo's local dev database fresh, but adds binary churn.
4. **Data cleansing scope for v1**: Start with none (just schema migration) or include basic cleansing (strip HTML descriptions)?
