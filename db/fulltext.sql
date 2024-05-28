CREATE VIRTUAL TABLE games_search USING fts5(id, title, author, tags, desc, seriesname, genre);

INSERT INTO games_search(id, title, author, tags, desc, seriesname, genre)
SELECT id, title, author, tags, desc, seriesname, genre
FROM games;
