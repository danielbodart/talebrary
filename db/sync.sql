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

-- 4. Rebuild gamelinks (full replace - IFDB owns this data)
DELETE FROM talebrary_gamelinks;
INSERT OR IGNORE INTO talebrary_gamelinks (game_id, url, format, extension, display_order)
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
