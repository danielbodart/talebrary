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
        const adventure = result.find(g => g.id = 'fft6pu91j85y4acv');
        expect(adventure).toEqual( {
            id: "fft6pu91j85y4acv",
            rating: 3.4791666666666665,
            rank: 2.1608101214368634,
            boost: 3,
            score: 8.63997678810353,
            title: "Adventure",
            author: "William Crowther and Donald Woods",
            description: null,
            playable: 1,
        } as any)
    });

    test("can get story by game id", async () => {
        const finder = new SqlGameFinder({db});
        const result = await finder.get('fft6pu91j85y4acv');
        expect(result).toEqual( {
            id: "fft6pu91j85y4acv",
            title: "Adventure",
            author: "William Crowther and Donald Woods",
            description: null,
            url: "http://www.ifarchive.org/if-archive/games/zcode/Advent.z5",
            coverart: "https://ifdb.org/viewgame?coverart&id=fft6pu91j85y4acv",
            type: "zcode",
        } as any);
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
        expect(result).toEqual({
            id: "qpecxgjpxnvw50xq",
            title: "The Elysium Enigma",
            author: "Eric Eve",
            description: "It was meant to be a routine visit on behalf of the imperial government, just to remind the settlers that the Empire hadn't forgotten them, and if you stick rigidly to the letter of your orders and refuse to use either your eyes or your initiative that's all it'll be. But with an interstellar war brewing in the background, you'd be wise not to take anything for granted.",
            url: "http://www.ifarchive.org/if-archive/games/competition2006/tads3/elysium/Elysium.t3",
            type: "tads3",
            coverart: "https://ifdb.org/viewgame?coverart&id=qpecxgjpxnvw50xq",
        } as any);
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
        const adventure = result.find(g => g.title === 'Adventure');
        expect(adventure).toBeDefined();
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
