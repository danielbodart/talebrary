import type {D1Database} from "@cloudflare/workers-types";

export interface GameInfo {
    id: string;
    name: string;
    author: string;
}

export class D1GameFinder {
    constructor(private db: D1Database) {
    }

    async find(search: string): Promise<GameInfo[]> {
        const sql = "select g.id, g.title, g.author from games g where g.title like ?";
        const statement = this.db.prepare(sql).bind(`%${search}%`);
        return (await statement.all()).results as any;
    }
}