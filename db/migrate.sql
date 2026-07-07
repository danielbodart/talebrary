-- One-time migration from IFDB schema to talebrary schema
-- Run locally: sqlite3 db/talebrary.sqlite < db/migrate.sql
-- Run on D1:   wrangler d1 execute talebrary --remote --file=db/migrate.sql

-- Create talebrary schema
CREATE TABLE IF NOT EXISTS talebrary_games (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    description TEXT,
    genre TEXT,
    language TEXT,
    published TEXT,
    coverart TEXT,
    tags TEXT,
    seriesname TEXT,
    avg_rating REAL,
    enabled INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    ifdb_moddate TEXT,
    synced_at TEXT
);

CREATE TABLE IF NOT EXISTS talebrary_gamelinks (
    game_id TEXT NOT NULL,
    url TEXT NOT NULL,
    format TEXT NOT NULL,
    extension TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    primary_file TEXT,
    PRIMARY KEY (game_id, url)
);

-- Migrate games
INSERT INTO talebrary_games (
    id, title, author, description, genre, language, published,
    coverart, tags, seriesname, avg_rating, enabled, synced_at
)
SELECT
    g.id, g.title, g.author, g.desc, g.genre, g.language, g.published,
    g.coverart, g.tags, g.seriesname,
    (SELECT AVG(r.rating) FROM reviews r WHERE r.gameid = g.id),
    1,
    datetime('now')
FROM games g;

-- Migrate gamelinks (denormalise with filetypes)
INSERT OR IGNORE INTO talebrary_gamelinks (game_id, url, format, extension, display_order, primary_file)
SELECT l.gameid, l.url, f.externid, f.extension, l.displayorder, NULLIF(l.compressedprimary, '')
FROM gamelinks l
JOIN filetypes f ON l.fmtid = f.id;

-- Resolve talebrary_gamelinks.format from the actual story filename when
-- IFDB tagged it generically (storyfile/*) or as an ADRIFT version variant.
-- Shared by sync.sql (.read) and applied standalone after a rebuild.
UPDATE talebrary_gamelinks
SET format = CASE
    WHEN lower(coalesce(nullif(primary_file,''), url)) LIKE '%.zblorb' OR lower(coalesce(nullif(primary_file,''), url)) LIKE '%.zlb'  THEN 'blorb/zcode'
    WHEN lower(coalesce(nullif(primary_file,''), url)) LIKE '%.gblorb' OR lower(coalesce(nullif(primary_file,''), url)) LIKE '%.blb'  THEN 'blorb/glulx'
    WHEN lower(coalesce(nullif(primary_file,''), url)) LIKE '%.ulx'    THEN 'glulx'
    WHEN lower(coalesce(nullif(primary_file,''), url)) LIKE '%.z3' OR lower(coalesce(nullif(primary_file,''), url)) LIKE '%.z4' OR lower(coalesce(nullif(primary_file,''), url)) LIKE '%.z5' OR lower(coalesce(nullif(primary_file,''), url)) LIKE '%.z7' OR lower(coalesce(nullif(primary_file,''), url)) LIKE '%.z8'  THEN 'zcode'
    WHEN lower(coalesce(nullif(primary_file,''), url)) LIKE '%.taf'    THEN 'adrift'
    WHEN lower(coalesce(nullif(primary_file,''), url)) LIKE '%.gam'    THEN 'tads2'
    WHEN lower(coalesce(nullif(primary_file,''), url)) LIKE '%.t3'     THEN 'tads3'
    WHEN lower(coalesce(nullif(primary_file,''), url)) LIKE '%.hex'    THEN 'hugo'
    WHEN lower(coalesce(nullif(primary_file,''), url)) LIKE '%.agx'    THEN 'agt'
    WHEN lower(coalesce(nullif(primary_file,''), url)) LIKE '%.acd' OR lower(coalesce(nullif(primary_file,''), url)) LIKE '%.a3c'  THEN 'alan3'
    ELSE format
END
WHERE format NOT IN ('zcode','blorb/zcode','glulx','blorb/glulx','hugo','adrift','alan2','alan3','agt','advsys','tads2','tads3');


-- Drop old tables
DROP TABLE IF EXISTS games_search;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS gamelinks;
DROP TABLE IF EXISTS filetypes;
DROP TABLE IF EXISTS games;

-- Drop unused IFDB tables
DROP TABLE IF EXISTS clubmembers;
DROP TABLE IF EXISTS clubs;
DROP TABLE IF EXISTS compdivs;
DROP TABLE IF EXISTS competitions;
DROP TABLE IF EXISTS compgames;
DROP TABLE IF EXISTS compprofilelinks;
DROP TABLE IF EXISTS comps_history;
DROP TABLE IF EXISTS crossrecs;
DROP TABLE IF EXISTS downloadhelp;
DROP TABLE IF EXISTS extreviews;
DROP TABLE IF EXISTS gamefwds;
DROP TABLE IF EXISTS gameprofilelinks;
DROP TABLE IF EXISTS games_history;
DROP TABLE IF EXISTS gametags;
DROP TABLE IF EXISTS gamexrefs;
DROP TABLE IF EXISTS gamexreftypes;
DROP TABLE IF EXISTS ifids;
DROP TABLE IF EXISTS iso639;
DROP TABLE IF EXISTS iso639x;
DROP TABLE IF EXISTS mirrors;
DROP TABLE IF EXISTS news;
DROP TABLE IF EXISTS operatingsystems;
DROP TABLE IF EXISTS osversions;
DROP TABLE IF EXISTS playedgames;
DROP TABLE IF EXISTS pollcomments;
DROP TABLE IF EXISTS polls;
DROP TABLE IF EXISTS pollvotes;
DROP TABLE IF EXISTS reclistitems;
DROP TABLE IF EXISTS reclists;
DROP TABLE IF EXISTS reviewtags;
DROP TABLE IF EXISTS reviewvotes;
DROP TABLE IF EXISTS sitenews;
DROP TABLE IF EXISTS specialreviewers;
DROP TABLE IF EXISTS stylesheets;
DROP TABLE IF EXISTS tagstats;
DROP TABLE IF EXISTS ucomments;
DROP TABLE IF EXISTS unwishlists;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS wishlists;

-- Build FTS5 search index
CREATE VIRTUAL TABLE IF NOT EXISTS talebrary_search USING fts5(
    id, title, author, tags, description, seriesname, genre
);

INSERT INTO talebrary_search (id, title, author, tags, description, seriesname, genre)
SELECT id, title, author, tags, description, seriesname, genre
FROM talebrary_games
WHERE enabled = 1;

VACUUM;
