import {Database, Statement} from "bun:sqlite";
import type {D1Database, D1ExecResult, D1PreparedStatement, D1Response, D1Result} from "@cloudflare/workers-types";

export class SqlitePrepareStatement implements D1PreparedStatement {
    constructor(private statement: Statement, private values: unknown[] = []) {
    }

    bind(...values: unknown[]): D1PreparedStatement {
        return new SqlitePrepareStatement(this.statement, values);
    }

    first<T = unknown>(colName: string): Promise<T | null>;
    first<T = Record<string, unknown>>(): Promise<T | null>;
    async first(_colName?: unknown): Promise<any> {
        return this.statement.get(...this.values);
    }

    run(): Promise<D1Response> {
        throw new Error("Method not implemented.");
    }

    async all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
        return {
            results: this.statement.all(...this.values)
        } as any;
    }

    raw<T = unknown[]>(options: { columnNames: true; }): Promise<[string[], ...T[]]>;
    raw<T = unknown[]>(options?: { columnNames?: false | undefined; } | undefined): Promise<T[]>;
    raw(_options?: unknown): Promise<any> {
        throw new Error("Method not implemented.");
    }
}

export class SqliteDatabase implements D1Database {
    constructor(private database: Database) {
    }

    prepare(query: string): D1PreparedStatement {
        return new SqlitePrepareStatement(this.database.prepare(query));
    }

    dump(): Promise<ArrayBuffer> {
        throw new Error("Method not implemented.");
    }

    batch<T = unknown>(_ignore: D1PreparedStatement[]): Promise<D1Result<T>[]> {
        throw new Error("Method not implemented.");
    }

    exec(_query: string): Promise<D1ExecResult> {
        throw new Error("Method not implemented.");
    }
}

export function talebrary() {
    return new SqliteDatabase(new Database("db/talebrary.sqlite"));
}