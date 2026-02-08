import type {D1Database} from "@cloudflare/workers-types";
import type {SupportedGameType} from "../types.ts";

import type {Dependency} from "@bodar/yadic/types.ts";

export interface GameBase {
    id: string;
    title: string;
    author: string;
    description?: string;
}

export interface GameInfo extends GameBase {
    rating: number;
    rank: number;
    boost: number;
    score: number;
    playable: 1 | 0;
}

export interface GameStory extends GameBase {
    url: string;
    coverart: string;
    type: SupportedGameType
}

const supportedFormats = `('zcode', 'blorb/zcode', 'glulx', 'blorb/glulx', 'hugo', 'adrift',
                    'alan2', 'alan3', 'agt', 'advsys', 'tads2', 'tads3')`;

const playableSubquery = `(SELECT CASE WHEN count(*) > 0 THEN 1 ELSE 0 END
                FROM gamelinks l
                         JOIN filetypes f ON l.fmtid = f.id
                WHERE l.gameid = g.id
                  AND f.externid IN ${supportedFormats}
                  AND (' ' || f.extension || ' ' LIKE
                       '% ' || SUBSTR(SUBSTR(l.url, LENGTH(l.url) - 7),
                                      INSTR(SUBSTR(l.url, LENGTH(l.url) - 7), '.')) ||
                       ' %')
                  AND l.url NOT LIKE '%.z6')`;

const gameReviewsCte = `game_reviews AS (
                SELECT g.id, avg(r.rating) AS rating
                FROM filtered_games g
                         JOIN reviews r ON g.id = r.gameid
                GROUP BY g.id
            )`;

const selectGameInfo = `SELECT fg.id,
                   gr.rating,
                   fg.rank,
                   fg.boost,
                   fg.rank + fg.boost + gr.rating AS score,
                   fg.title,
                   fg.author,
                   fg.description,
                   fg.playable
            FROM filtered_games fg
                     JOIN game_reviews gr USING (id)
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

export class D1GameFinder {
    constructor(deps: Dependency<'db', D1Database>, private db = deps.db) {
    }

    async find(search: string, languages?: string[]): Promise<GameInfo[]> {
        const lang = languageCondition(languages, 2);
        const langWhere = lang.sql ? `WHERE ${lang.sql}` : '';
        const sql = `
            WITH ranks AS (
                SELECT g.id, 0 as rank
                FROM games g
                WHERE ?1 = ''
                UNION
                SELECT s.id, abs(bm25(games_search, 1, 2, 2)) AS rank
                FROM games_search s
                WHERE ?1 <> '' AND games_search = ?1
            ),
            filtered_games AS (
                SELECT g.id,
                       r.rank,
                       CASE WHEN lower(g.title) = lower(?1) THEN 3 ELSE 0 END AS boost,
                       g.title,
                       g.author,
                       g.desc AS description,
                       ${playableSubquery} AS playable
                FROM ranks r JOIN games g ON g.id = r.id
                ${langWhere}
            ),
            ${gameReviewsCte}
            ${selectGameInfo}
        `;
        const statement = this.db.prepare(sql).bind(search ?? '', ...lang.params);
        return (await statement.all()).results as any;
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
                       g.desc AS description,
                       ${playableSubquery} AS playable
                FROM games g
                WHERE g.genre = ?1
                ${langAnd}
            ),
            ${gameReviewsCte}
            ${selectGameInfo}
        `;
        return (await this.db.prepare(sql).bind(genre, ...lang.params).all()).results as any;
    }

    async findTopRated(languages?: string[]): Promise<GameInfo[]> {
        const lang = languageCondition(languages, 1);
        const langWhere = lang.sql ? `WHERE ${lang.sql}` : '';
        const sql = `
            WITH filtered_games AS (
                SELECT g.id,
                       0 AS rank,
                       0 AS boost,
                       g.title,
                       g.author,
                       g.desc AS description,
                       ${playableSubquery} AS playable
                FROM games g
                ${langWhere}
            ),
            ${gameReviewsCte}
            SELECT fg.id,
                   gr.rating,
                   fg.rank,
                   fg.boost,
                   gr.rating AS score,
                   fg.title,
                   fg.author,
                   fg.description,
                   fg.playable
            FROM filtered_games fg
                     JOIN game_reviews gr USING (id)
            WHERE fg.playable = 1
            ORDER BY gr.rating DESC
            LIMIT 20;
        `;
        return (await this.db.prepare(sql).bind(...lang.params).all()).results as any;
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
                       g.desc AS description,
                       ${playableSubquery} AS playable
                FROM games g
                WHERE g.published IS NOT NULL
                ${langAnd}
            ),
            ${gameReviewsCte}
            SELECT fg.id,
                   gr.rating,
                   fg.rank,
                   fg.boost,
                   gr.rating AS score,
                   fg.title,
                   fg.author,
                   fg.description,
                   fg.playable
            FROM filtered_games fg
                     JOIN game_reviews gr USING (id)
            WHERE fg.playable = 1
            ORDER BY fg.id DESC
            LIMIT 20;
        `;
        return (await this.db.prepare(sql).bind(...lang.params).all()).results as any;
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
                       g.desc AS description,
                       ${playableSubquery} AS playable
                FROM games g
                WHERE g.id IN (${placeholders})
                ${langAnd}
            ),
            ${gameReviewsCte}
            SELECT fg.id,
                   gr.rating,
                   fg.rank,
                   fg.boost,
                   gr.rating AS score,
                   fg.title,
                   fg.author,
                   fg.description,
                   fg.playable
            FROM filtered_games fg
                     JOIN game_reviews gr USING (id)
            WHERE fg.playable = 1
            ORDER BY gr.rating DESC;
        `;
        return (await this.db.prepare(sql).bind(...ids, ...lang.params).all()).results as any;
    }

    async get(id: string): Promise<GameStory | null | undefined> {
        const sql = `
            select g.id, g.title, g.author, g.desc as description, l.url, f.externid as type, g.coverart
            from games g
                     join gamelinks l on g.id = l.gameid
                     join filetypes f on l.fmtid = f.id
            where g.id = ?
              and f.externid IN ${supportedFormats}
              and (' ' || f.extension || ' ' LIKE
                   '% ' || SUBSTR(SUBSTR(l.url, LENGTH(l.url) - 7), INSTR(SUBSTR(l.url, LENGTH(l.url) - 7), '.')) ||
                   ' %')
              and l.url NOT LIKE '%.z6'
            order by l.displayorder asc
            limit 1
        `;
        return await this.db.prepare(sql).bind(id).first();
    }
}
