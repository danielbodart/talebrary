import {describe, expect, test} from "bun:test";
import {talebrary} from "../../src/bun/SqliteDatabase.ts";
import type {TalebraryDatabase} from "../../src/database/TalebraryDatabase.ts";

/**
 * Contract tests for TalebraryDatabase implementations.
 *
 * Verifies that prepare/bind/all/first work correctly against
 * a real SQLite database (the only testable implementation locally).
 */
function databaseContractTests(name: string, setup: () => TalebraryDatabase) {
    describe(`${name} - TalebraryDatabase contract`, () => {
        test("prepare and all returns results array", async () => {
            const db = setup();
            const result = await db.prepare("SELECT 1 as value").all<{ value: number }>();
            expect(result.results).toBeArray();
            expect(result.results[0].value).toBe(1);
        });

        test("prepare and first returns single row", async () => {
            const db = setup();
            const result = await db.prepare("SELECT 42 as answer").first<{ answer: number }>();
            expect(result).not.toBeNull();
            expect(result!.answer).toBe(42);
        });

        test("first returns null for no results", async () => {
            const db = setup();
            const result = await db.prepare("SELECT 1 WHERE 0").first();
            expect(result).toBeNull();
        });

        test("bind substitutes parameters", async () => {
            const db = setup();
            const result = await db.prepare("SELECT ? as value").bind("hello").first<{ value: string }>();
            expect(result!.value).toBe("hello");
        });

        test("bind with multiple parameters", async () => {
            const db = setup();
            const result = await db.prepare("SELECT ?1 as a, ?2 as b")
                .bind("first", "second")
                .first<{ a: string; b: string }>();
            expect(result!.a).toBe("first");
            expect(result!.b).toBe("second");
        });

        test("all with bind returns filtered results", async () => {
            const db = setup();
            const result = await db.prepare(
                "SELECT g.id FROM talebrary_games g WHERE g.id = ?"
            ).bind("fft6pu91j85y4acv").all<{ id: string }>();
            expect(result.results.length).toBe(1);
            expect(result.results[0].id).toBe("fft6pu91j85y4acv");
        });
    });
}

// SqliteDatabase (Bun)
databaseContractTests("SqliteDatabase", () => talebrary());
