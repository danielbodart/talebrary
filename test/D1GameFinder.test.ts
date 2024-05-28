import {describe, expect, test} from "bun:test";
import {D1GameFinder} from "../src/D1GameFinder.ts";
import {talebrary} from "../src/local/SqliteDatabase.ts";

describe("D1GameFinder", () => {
    const db = talebrary();

    test("can find by title name", async () => {
        const finder = new D1GameFinder(db);
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
        const finder = new D1GameFinder(db);
        const result = await finder.get('fft6pu91j85y4acv');
        expect(result).toEqual( {
            id: "fft6pu91j85y4acv",
            title: "Adventure",
            author: "William Crowther and Donald Woods",
            description: null,
            url: "http://www.ifarchive.org/if-archive/games/zcode/Advent.z5",
            type: "zcode",
        } as any);
    });
})
