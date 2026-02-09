import type {D1Database, D1PreparedStatement} from "@cloudflare/workers-types";
import type {TalebraryDatabase, TalebraryStatement} from "./TalebraryDatabase.ts";

class D1StatementAdapter implements TalebraryStatement {
    constructor(private statement: D1PreparedStatement) {
    }

    bind(...values: unknown[]): TalebraryStatement {
        return new D1StatementAdapter(this.statement.bind(...values));
    }

    async all<T = Record<string, unknown>>(): Promise<{ results: T[] }> {
        return this.statement.all<T>();
    }

    async first<T = Record<string, unknown>>(): Promise<T | null> {
        return this.statement.first<T>();
    }
}

export class D1Adapter implements TalebraryDatabase {
    constructor(private d1: D1Database) {
    }

    prepare(query: string): TalebraryStatement {
        return new D1StatementAdapter(this.d1.prepare(query));
    }
}
