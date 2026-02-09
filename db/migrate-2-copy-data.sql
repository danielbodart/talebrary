-- Step 2: Migrate data from old tables
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

INSERT OR IGNORE INTO talebrary_gamelinks (game_id, url, format, extension, display_order)
SELECT l.gameid, l.url, f.externid, f.extension, l.displayorder
FROM gamelinks l
JOIN filetypes f ON l.fmtid = f.id;
