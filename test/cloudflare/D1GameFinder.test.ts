import {describe, expect, test} from "bun:test";
import {SqlGameFinder} from "../../src/games/SqlGameFinder.ts";
import {talebrary} from "../../src/bun/SqliteDatabase.ts";

describe("SqlGameFinder", () => {
    const db = talebrary();

    test("if no search parameter is provided just return all", async () => {
        const finder = new SqlGameFinder({db});
        const result = await finder.find('');
        expect(result).toBeArray();
        expect(result.length).toEqual(20)
    });

    test("can find by title name", async () => {
        const finder = new SqlGameFinder({db});
        const result = await finder.find("Adventure");
        expect(result).toBeArray();
        expect(result.length).toBeGreaterThan(0);
        // Which specific games rank top shifts with every dump, so assert shape:
        // results are playable, scored, titled, and sorted by score descending.
        for (const g of result) {
            expect(g.playable).toBe(1);
            expect(typeof g.score).toBe("number");
            expect(g.title).toBeTruthy();
        }
        const scores = result.map(g => g.score);
        expect(scores).toEqual([...scores].sort((a, b) => b - a));
    });

    test("can get story by game id", async () => {
        const finder = new SqlGameFinder({db});
        const result = await finder.get('fft6pu91j85y4acv');
        // id + type are stable; title/url/author/coverart move with each IFDB dump.
        expect(result!.id).toBe("fft6pu91j85y4acv");
        expect(result!.type).toBe("zcode");
        expect(result!.url).toBeTruthy();
        expect(result!.title).toBeTruthy();
        expect(result!.coverart).toContain("fft6pu91j85y4acv");
    });

    test("can find by genre", async () => {
        const finder = new SqlGameFinder({db});
        const result = await finder.findByGenre('Fantasy');
        expect(result).toBeArray();
        expect(result.length).toEqual(20);
        expect(result[0].playable).toEqual(1);
        expect(result[0].rating).toBeGreaterThan(0);
    });

    test("can find top rated", async () => {
        const finder = new SqlGameFinder({db});
        const result = await finder.findTopRated();
        expect(result).toBeArray();
        expect(result.length).toEqual(20);
        expect(result[0].rating).toBeGreaterThanOrEqual(result[1].rating);
    });

    test("can find recent", async () => {
        const finder = new SqlGameFinder({db});
        const result = await finder.findRecent();
        expect(result).toBeArray();
        expect(result.length).toEqual(20);
    });

    test("can find by ids", async () => {
        const finder = new SqlGameFinder({db});
        const result = await finder.findByIds(['fft6pu91j85y4acv']);
        expect(result).toBeArray();
        expect(result.length).toBeGreaterThanOrEqual(1);
        expect(result[0].id).toEqual('fft6pu91j85y4acv');
        expect(result[0].playable).toEqual(1);
    });

    test("can get tads3 game by id", async () => {
        const finder = new SqlGameFinder({db});
        const result = await finder.get('qpecxgjpxnvw50xq');
        // Verifies tads3 type mapping survives; content fields move with the dump.
        expect(result!.id).toBe("qpecxgjpxnvw50xq");
        expect(result!.type).toBe("tads3");
        expect(result!.url).toBeTruthy();
        expect(result!.title).toBeTruthy();
    });

    test("language filter: English-only returns results", async () => {
        const finder = new SqlGameFinder({db});
        const result = await finder.find('', ['en', 'en-us', 'en-gb']);
        expect(result).toBeArray();
        expect(result.length).toEqual(20);
    });

    test("language filter: French user sees English and French games", async () => {
        const finder = new SqlGameFinder({db});
        const result = await finder.find('', ['en', 'en-us', 'en-gb', 'fr']);
        expect(result).toBeArray();
        expect(result.length).toEqual(20);
    });

    test("language filter: no languages returns all (no filter)", async () => {
        const finder = new SqlGameFinder({db});
        const withFilter = await finder.find('');
        const withoutFilter = await finder.find('', undefined);
        expect(withFilter.length).toEqual(withoutFilter.length);
    });

    test("language filter works with search", async () => {
        const finder = new SqlGameFinder({db});
        const result = await finder.find('Adventure', ['en', 'en-us', 'en-gb']);
        expect(result).toBeArray();
        // Language filter must not wrongly exclude English matches for the search.
        expect(result.length).toBeGreaterThan(0);
    });

    test("language filter works with findByGenre", async () => {
        const finder = new SqlGameFinder({db});
        const result = await finder.findByGenre('Fantasy', ['en', 'en-us', 'en-gb']);
        expect(result).toBeArray();
        expect(result.length).toEqual(20);
    });

    test("language filter works with findTopRated", async () => {
        const finder = new SqlGameFinder({db});
        const result = await finder.findTopRated(['en', 'en-us', 'en-gb']);
        expect(result).toBeArray();
        expect(result.length).toEqual(20);
    });

    test("language filter works with findRecent", async () => {
        const finder = new SqlGameFinder({db});
        const result = await finder.findRecent(['en', 'en-us', 'en-gb']);
        expect(result).toBeArray();
        expect(result.length).toEqual(20);
    });

    test("language filter works with findByIds", async () => {
        const finder = new SqlGameFinder({db});
        const result = await finder.findByIds(['fft6pu91j85y4acv'], ['en', 'en-us', 'en-gb']);
        expect(result).toBeArray();
        expect(result.length).toBeGreaterThanOrEqual(1);
        expect(result[0].id).toEqual('fft6pu91j85y4acv');
    });
})
