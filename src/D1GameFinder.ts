import type {D1Database} from "@cloudflare/workers-types";
import type {SupportedGameType} from "./types.ts";

export interface GameBase {
    id: string;
    title: string;
    author: string;
    description: string;
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
    type: SupportedGameType
}

export class D1GameFinder {
    constructor(private db: D1Database) {
    }

    async find(search: string): Promise<GameInfo[]> {
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
                            CASE
                                WHEN lower(g.title) = lower(?1) THEN 3
                                ELSE 0
                                END AS boost,
                            g.title,
                            g.author,
                            g.desc AS description,
                            (SELECT CASE WHEN count(*) > 0 THEN 1 ELSE 0 END
                             FROM gamelinks l
                                      JOIN filetypes f ON l.fmtid = f.id
                             WHERE l.gameid = g.id
                               AND f.externid IN
                                   ('zcode', 'blorb/zcode', 'glulx', 'blorb/glulx', 'hugo', 'adrift',
                                    'tads2', 'tads3')
                               AND (' ' || f.extension || ' ' LIKE
                                    '% ' || SUBSTR(SUBSTR(l.url, LENGTH(l.url) - 5),
                                                   INSTR(SUBSTR(l.url, LENGTH(l.url) - 5), '.')) ||
                                    ' %')) AS playable
                     FROM ranks r JOIN games g ON g.id = r.id
                     WHERE g.coverart IS NOT NULL
                 ),
                 game_reviews AS (
                     SELECT g.id, avg(r.rating) AS rating
                     FROM filtered_games g
                              JOIN reviews r ON g.id = r.gameid
                     GROUP BY g.id
                 )
            SELECT fg.id,
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
            LIMIT 20;

        `;
        const statement = this.db.prepare(sql).bind(search ?? '');
        return (await statement.all()).results as any;
    }

    async get(id: string): Promise<GameStory | null | undefined> {
        const sql = `
            select g.id, g.title, g.author, g.desc as description, l.url, f.externid as type
            from games g
                     join gamelinks l on g.id = l.gameid
                     join filetypes f on l.fmtid = f.id
            where g.id = ?
              and f.externid IN
                  ('zcode', 'blorb/zcode', 'glulx', 'blorb/glulx', 'hugo', 'adrift', 'tads2', 'tads3')
              and (' ' || f.extension || ' ' LIKE
                   '% ' || SUBSTR(SUBSTR(l.url, LENGTH(l.url) - 5), INSTR(SUBSTR(l.url, LENGTH(l.url) - 5), '.')) ||
                   ' %')
            order by l.displayorder asc
            limit 1
        `;
        return await this.db.prepare(sql).bind(id).first();
    }
}