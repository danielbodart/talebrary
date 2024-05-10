import type {D1Database} from "@cloudflare/workers-types";

export class D1GameFinder {
    constructor(private db: D1Database) {
    }

    async find(search: string): Promise<any[]> {
        const statement = this.db.prepare("select g.id, g.title, g.author from games g where g.title like ?").bind(`%${search}%`);
        return (await statement.all()).results;
    }
}