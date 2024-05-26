import type {D1Database} from "@cloudflare/workers-types";

export interface GameInfo {
    id: string;
    rating: number;
    title: string;
    author: string;
    description: string;
    coverart: string;
    playable: boolean;
}

export class D1GameFinder {
    constructor(private db: D1Database) {
    }

    async find(search: string): Promise<GameInfo[]> {
        const sql = `
            select g.id, avg(r.rating) as rating, g.title, g.author, g.desc as description, g.coverart,
                   (select
                        CASE WHEN count(*) > 0 THEN 1 ELSE 0 END
                    from gamelinks l
                             join filetypes f on l.fmtid = f.id
                    where l.gameid = g.id
                      and f.externid IN ('zcode', 'blorb/zcode', 'glulx', 'blorb/glulx', 'hugo', 'adrift', 'tads2', 'tads3')) as playable
            from games g
                     join reviews r on g.id = r.gameid
            where g.title like ?
              and g.coverart is not null
            group by 1
            order by 2 desc;`;
        const statement = this.db.prepare(sql).bind(`%${search}%`);
        return (await statement.all()).results as any;
    }
}