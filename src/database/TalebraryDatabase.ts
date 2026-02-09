export interface TalebraryStatement {
    bind(...values: unknown[]): TalebraryStatement;
    all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
    first<T = Record<string, unknown>>(): Promise<T | null>;
}

export interface TalebraryDatabase {
    prepare(query: string): TalebraryStatement;
}
