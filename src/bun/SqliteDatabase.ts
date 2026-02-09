import {Database, Statement} from "bun:sqlite";
import type {TalebraryDatabase, TalebraryStatement} from "../database/TalebraryDatabase.ts";

class SqliteStatement implements TalebraryStatement {
    constructor(private statement: Statement, private values: unknown[] = []) {
    }

    bind(...values: unknown[]): TalebraryStatement {
        return new SqliteStatement(this.statement, values);
    }

    async first<T = Record<string, unknown>>(): Promise<T | null> {
        return this.statement.get(...this.values) as T | null;
    }

    async all<T = Record<string, unknown>>(): Promise<{ results: T[] }> {
        return {results: this.statement.all(...this.values) as T[]};
    }
}

export class SqliteDatabase implements TalebraryDatabase {
    constructor(private database: Database) {
    }

    prepare(query: string): TalebraryStatement {
        return new SqliteStatement(this.database.prepare(query));
    }
}

export function talebrary() {
    return new SqliteDatabase(new Database("db/talebrary.sqlite"));
}
