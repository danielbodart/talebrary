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
    PRIMARY KEY (game_id, url)
);

CREATE VIRTUAL TABLE IF NOT EXISTS talebrary_search USING fts5(
    id, title, author, tags, description, seriesname, genre
);
