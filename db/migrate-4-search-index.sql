-- Step 4: Build FTS5 search index
CREATE VIRTUAL TABLE IF NOT EXISTS talebrary_search USING fts5(
    id, title, author, tags, description, seriesname, genre
);

INSERT INTO talebrary_search (id, title, author, tags, description, seriesname, genre)
SELECT id, title, author, tags, description, seriesname, genre
FROM talebrary_games
WHERE enabled = 1;
