import {describe, expect, test} from "bun:test";
import {SqlGameFinder} from "../../src/games/SqlGameFinder.ts";
import {InMemoryGameFinder} from "../../src/games/InMemoryGameFinder.ts";
import {talebrary} from "../../src/bun/SqliteDatabase.ts";
import type {GameFinder, GameInfo, GameStory} from "../../src/games/GameFinder.ts";

/**
 * Contract tests for GameFinder implementations.
 *
 * Both SqlGameFinder and InMemoryGameFinder must satisfy the same contract:
 * - find() returns GameInfo[] (max 20)
 * - findByGenre() returns GameInfo[]
 * - findTopRated() returns GameInfo[] sorted by rating desc
 * - findRecent() returns GameInfo[]
 * - findByIds() returns GameInfo[] for given ids
 * - get() returns GameStory or null
 */
function gameFinderContractTests(name: string, setup: () => GameFinder) {
    describe(`${name} - GameFinder contract`, () => {
        test("find returns array of GameInfo", async () => {
            const finder = setup();
            const results = await finder.find('');
            expect(results).toBeArray();
            for (const game of results) {
                expect(game).toHaveProperty("id");
                expect(game).toHaveProperty("title");
                expect(game).toHaveProperty("author");
                expect(game).toHaveProperty("rating");
                expect(game).toHaveProperty("playable");
            }
        });

        test("find limits results to 20", async () => {
            const finder = setup();
            const results = await finder.find('');
            expect(results.length).toBeLessThanOrEqual(20);
        });

        test("find with search term filters results", async () => {
            const finder = setup();
            const all = await finder.find('');
            const filtered = await finder.find('Adventure');
            expect(filtered.length).toBeLessThanOrEqual(all.length);
        });

        test("findTopRated returns results sorted by rating descending", async () => {
            const finder = setup();
            const results = await finder.findTopRated();
            for (let i = 1; i < results.length; i++) {
                expect(results[i - 1].rating).toBeGreaterThanOrEqual(results[i].rating);
            }
        });

        test("findByIds returns only requested games", async () => {
            const finder = setup();
            const all = await finder.find('');
            if (all.length === 0) return;
            const ids = [all[0].id];
            const results = await finder.findByIds(ids);
            expect(results.length).toBeGreaterThanOrEqual(1);
            expect(results[0].id).toEqual(ids[0]);
        });

        test("get returns GameStory for known id", async () => {
            const finder = setup();
            const all = await finder.find('');
            if (all.length === 0) return;
            const story = await finder.get(all[0].id);
            if (story) {
                expect(story).toHaveProperty("id");
                expect(story).toHaveProperty("title");
                expect(story).toHaveProperty("url");
                expect(story).toHaveProperty("type");
            }
        });

        test("get returns null for unknown id", async () => {
            const finder = setup();
            const result = await finder.get('nonexistent-id-999');
            expect(result).toBeNull();
        });

        test("findAllIds returns array of string ids", async () => {
            const finder = setup();
            const ids = await finder.findAllIds();
            expect(ids).toBeArray();
            for (const id of ids) expect(typeof id).toBe("string");
        });

        test("findAllIds includes every playable game returned by find", async () => {
            const finder = setup();
            const all = await finder.find('');
            const ids = await finder.findAllIds();
            for (const game of all) {
                if (game.playable === 1) expect(ids).toContain(game.id);
            }
        });
    });
}

// SqlGameFinder with real SQLite database
gameFinderContractTests("SqlGameFinder", () => {
    const db = talebrary();
    return new SqlGameFinder({db});
});

// InMemoryGameFinder with test data
gameFinderContractTests("InMemoryGameFinder", () => {
    const games: GameInfo[] = Array.from({length: 25}, (_, i) => ({
        id: `game-${i}`,
        title: i === 0 ? "Adventure" : `Game ${i}`,
        author: `Author ${i}`,
        description: `Description for game ${i}`,
        rating: 5 - (i * 0.2),
        rank: i,
        boost: 0,
        score: 5 - (i * 0.2),
        playable: 1 as const,
    }));

    const stories = new Map<string, GameStory>([
        ["game-0", {id: "game-0", title: "Adventure", author: "Author 0", url: "http://example.com/adventure.z5", coverart: "", type: "zcode"}],
        ["game-1", {id: "game-1", title: "Game 1", author: "Author 1", url: "http://example.com/game1.z5", coverart: "", type: "zcode"}],
    ]);

    return new InMemoryGameFinder(games, stories);
});
