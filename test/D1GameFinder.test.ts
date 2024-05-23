import {describe, expect, test} from "bun:test";
import {D1GameFinder} from "../src/D1GameFinder.ts";
import {talebrary} from "../src/local/SqliteDatabase.ts";

describe("D1GameFinder", () => {
    const db = talebrary();

    test("can find by title name", async () => {
        const finder = new D1GameFinder(db);
        const result = await finder.find("Adventure");
        expect(result).toBeArray();
    });
})
