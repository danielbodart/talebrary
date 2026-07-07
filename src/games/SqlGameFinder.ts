import type {TalebraryDatabase} from "../database/TalebraryDatabase.ts";
import type {GameFinder, GameInfo, GameStory} from "./GameFinder.ts";

import type {Dependency} from "@bodar/yadic/types.ts";

const supportedFormats = `('zcode', 'blorb/zcode', 'glulx', 'blorb/glulx', 'hugo', 'adrift',
                    'alan2', 'alan3', 'agt', 'advsys', 'tads2', 'tads3', 'level9')`;

// The link's URL file extension is in the format's declared extension list.
const extensionMatch = `(' ' || l.extension || ' ' LIKE
                       '% ' || SUBSTR(SUBSTR(l.url, LENGTH(l.url) - 7),
                                      INSTR(SUBSTR(l.url, LENGTH(l.url) - 7), '.')) ||
                       ' %')`;

// A compressed archive we can extract the story from at serve time (see archive.ts).
const archiveMatch = `(lower(l.url) LIKE '%.zip' OR lower(l.url) LIKE '%.tgz'
                       OR lower(l.url) LIKE '%.gz' OR lower(l.url) LIKE '%.tar')`;

// A link is playable when it is a supported format and either a bare story file
// or an archive we can unpack. Prefer bare files over archives (isArchive ASC).
const playableLink = `l.format IN ${supportedFormats}
                  AND (${extensionMatch} OR ${archiveMatch})
                  AND l.url NOT LIKE '%.z6'`;
const preferBareFile = `(CASE WHEN ${archiveMatch} THEN 1 ELSE 0 END) ASC, l.display_order ASC`;

const playableSubquery = `(SELECT CASE WHEN count(*) > 0 THEN 1 ELSE 0 END
                FROM talebrary_gamelinks l
                WHERE l.game_id = g.id
                  AND ${playableLink})`;

const selectGameInfo = `SELECT fg.id,
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
            LIMIT 20;`;

function languageCondition(languages: string[] | undefined, paramStart: number): { sql: string, params: string[] } {
    if (!languages || languages.length === 0) return {sql: '', params: []};

    const conditions = languages.map((_, i) =>
        `(', ' || lower(g.language) || ', ') LIKE '%, ' || ?${paramStart + i} || ', %'`
    );

    return {
        sql: `(g.language IS NULL OR ${conditions.join(' OR ')})`,
        params: languages
    };
}

export class SqlGameFinder implements GameFinder {
    constructor(deps: Dependency<'db', TalebraryDatabase>, private db = deps.db) {
    }

    async find(search: string, languages?: string[], genre?: string): Promise<GameInfo[]> {
        const lang = languageCondition(languages, 2);
        const genreParam = 2 + lang.params.length;
        const genreAnd = genre ? `AND g.genre = ?${genreParam}` : '';
        const sql = `
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
                ${lang.sql ? `AND ${lang.sql}` : ''}
                ${genreAnd}
            )
            ${selectGameInfo}
        `;
        const params: string[] = [search ?? '', ...lang.params];
        if (genre) params.push(genre);
        return (await this.db.prepare(sql).bind(...params).all<GameInfo>()).results;
    }

    async findByGenre(genre: string, languages?: string[]): Promise<GameInfo[]> {
        const lang = languageCondition(languages, 2);
        const langAnd = lang.sql ? `AND ${lang.sql}` : '';
        const sql = `
            WITH filtered_games AS (
                SELECT g.id,
                       0 AS rank,
                       0 AS boost,
                       g.title,
                       g.author,
                       g.description,
                       COALESCE(g.avg_rating, 0) AS rating,
                       ${playableSubquery} AS playable
                FROM talebrary_games g
                WHERE g.genre = ?1
                AND g.enabled = 1
                ${langAnd}
            )
            ${selectGameInfo}
        `;
        return (await this.db.prepare(sql).bind(genre, ...lang.params).all<GameInfo>()).results;
    }

    async findTopRated(languages?: string[]): Promise<GameInfo[]> {
        const lang = languageCondition(languages, 1);
        const langAnd = lang.sql ? `AND ${lang.sql}` : '';
        const sql = `
            WITH filtered_games AS (
                SELECT g.id,
                       0 AS rank,
                       0 AS boost,
                       g.title,
                       g.author,
                       g.description,
                       COALESCE(g.avg_rating, 0) AS rating,
                       ${playableSubquery} AS playable
                FROM talebrary_games g
                WHERE g.enabled = 1
                ${langAnd}
            )
            SELECT fg.id,
                   fg.rating,
                   fg.rank,
                   fg.boost,
                   fg.rating AS score,
                   fg.title,
                   fg.author,
                   fg.description,
                   fg.playable
            FROM filtered_games fg
            WHERE fg.playable = 1
            ORDER BY fg.rating DESC
            LIMIT 20;
        `;
        return (await this.db.prepare(sql).bind(...lang.params).all<GameInfo>()).results;
    }

    async findRecent(languages?: string[]): Promise<GameInfo[]> {
        const lang = languageCondition(languages, 1);
        const langAnd = lang.sql ? `AND ${lang.sql}` : '';
        const sql = `
            WITH filtered_games AS (
                SELECT g.id,
                       0 AS rank,
                       0 AS boost,
                       g.title,
                       g.author,
                       g.description,
                       COALESCE(g.avg_rating, 0) AS rating,
                       ${playableSubquery} AS playable
                FROM talebrary_games g
                WHERE g.published IS NOT NULL
                AND g.enabled = 1
                ${langAnd}
            )
            SELECT fg.id,
                   fg.rating,
                   fg.rank,
                   fg.boost,
                   fg.rating AS score,
                   fg.title,
                   fg.author,
                   fg.description,
                   fg.playable
            FROM filtered_games fg
            WHERE fg.playable = 1
            ORDER BY fg.id DESC
            LIMIT 20;
        `;
        return (await this.db.prepare(sql).bind(...lang.params).all<GameInfo>()).results;
    }

    async findByIds(ids: string[], languages?: string[]): Promise<GameInfo[]> {
        const placeholders = ids.map((_, i) => `?${i + 1}`).join(', ');
        const lang = languageCondition(languages, ids.length + 1);
        const langAnd = lang.sql ? `AND ${lang.sql}` : '';
        const sql = `
            WITH filtered_games AS (
                SELECT g.id,
                       0 AS rank,
                       0 AS boost,
                       g.title,
                       g.author,
                       g.description,
                       COALESCE(g.avg_rating, 0) AS rating,
                       ${playableSubquery} AS playable
                FROM talebrary_games g
                WHERE g.id IN (${placeholders})
                AND g.enabled = 1
                ${langAnd}
            )
            SELECT fg.id,
                   fg.rating,
                   fg.rank,
                   fg.boost,
                   fg.rating AS score,
                   fg.title,
                   fg.author,
                   fg.description,
                   fg.playable
            FROM filtered_games fg
            WHERE fg.playable = 1
            ORDER BY fg.rating DESC;
        `;
        return (await this.db.prepare(sql).bind(...ids, ...lang.params).all<GameInfo>()).results;
    }

    async findAllIds(): Promise<string[]> {
        const sql = `
            SELECT g.id
            FROM talebrary_games g
            WHERE g.enabled = 1
              AND ${playableSubquery} = 1
            ORDER BY g.id
        `;
        return (await this.db.prepare(sql).all<{ id: string }>()).results.map(r => r.id);
    }

    async get(id: string): Promise<GameStory | null> {
        const sql = `
            SELECT g.id, g.title, g.author, g.description, l.url, l.format AS type, g.coverart, l.primary_file AS "primary"
            FROM talebrary_games g
            JOIN talebrary_gamelinks l ON g.id = l.game_id
            WHERE g.id = ?
              AND g.enabled = 1
              AND ${playableLink}
            ORDER BY ${preferBareFile}
            LIMIT 1
        `;
        return await this.db.prepare(sql).bind(id).first<GameStory>();
    }
}
