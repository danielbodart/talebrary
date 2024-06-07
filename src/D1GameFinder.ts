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
            with filtered_games as (select g.id,
                                           abs(bm25(games_search, 1, 2, 2)) AS rank,
                                           CASE
                                               WHEN lower(g.title) = lower(?1) THEN 3
                                               ELSE 0
                                               END                          as boost,
                                           g.title,
                                           g.author,
                                           g.desc                           as description,
                                           (select CASE WHEN count(*) > 0 THEN 1 ELSE 0 END
                                            from gamelinks l
                                                     join filetypes f on l.fmtid = f.id
                                            where l.gameid = g.id
                                              and f.externid IN
                                                  ('zcode', 'blorb/zcode', 'glulx', 'blorb/glulx', 'hugo', 'adrift',
                                                   'tads2', 'tads3'))       as playable
                                    from games_search s
                                             join games g on g.id = s.id
                                    where games_search MATCH ?1
                                      and g.coverart is not null),
                 game_reviews as (select g.id, avg(r.rating) as rating
                                  from filtered_games g
                                           join reviews r on g.id = r.gameid
                                  group by g.id)
            select fg.id, gr.rating, fg.rank, fg.boost, 
                   fg.rank + fg.boost + gr.rating as score,
                   fg.title,
                   fg.author,
                   fg.description, 
                   fg.playable
            from filtered_games fg
                     join game_reviews gr using (id)
            where fg.playable = 1
            order by score desc
            limit 20;
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
            order by l.displayorder asc
            limit 1
        `;
        return await this.db.prepare(sql).bind(id).first();
    }
}