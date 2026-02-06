import {describe, expect, test} from "bun:test";
import {D1GameFinder} from "../../src/cloudflare/D1GameFinder.ts";
import {talebrary} from "../../src/bun/SqliteDatabase.ts";

describe("D1GameFinder", () => {
    const db = talebrary();

    test("if no search parameter is provided just return all", async () => {
        const finder = new D1GameFinder({db});
        const result = await finder.find('');
        expect(result).toBeArray();
        expect(result.length).toEqual(20)
    });

    test("can find by title name", async () => {
        const finder = new D1GameFinder({db});
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
        const finder = new D1GameFinder({db});
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

    test("returns null for unsupported game types like tads3", async () => {
        const finder = new D1GameFinder({db});
        const result = await finder.get('qpecxgjpxnvw50xq');
        expect(result).toBeNull();
    });
})
