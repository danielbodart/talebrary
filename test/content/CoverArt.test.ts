import {describe, expect, test} from "bun:test";
import {coverArt} from "../../src/content/CoverArt.ts";
import {IllustrationHandler} from "../../src/content/IllustrationHandler.ts";
import type {D1GameFinder, GameStory} from "../../src/cloudflare/D1GameFinder.ts";
import type {Http} from "../../src/http/mod.ts";
import {DumbAi} from "../../src/bun/DumbAi.ts";
import type {TalebraryBucket} from "../../src/storage/TalebraryBucket.ts";
import type {TalebraryAi} from "../../src/ai/TalebraryAi.ts";

function stubFinder(game: GameStory | null): D1GameFinder {
    return {get: async () => game} as any;
}

function stubBucket(): TalebraryBucket {
    return {
        get: async () => new Response(null, {status: 404}),
        put: async () => {},
    };
}

const dumbAi = new DumbAi();

describe("coverArt", () => {
    test("style-transfers cover art when game has coverart URL", async () => {
        let fetchedUrl = '';
        let savedKey = '';
        const http: Http = async (request) => {
            fetchedUrl = request.url;
            return new Response("image data", {
                status: 200,
                headers: {"content-type": "image/jpeg"},
            });
        };
        const bucket = stubBucket();
        bucket.put = async (key) => { savedKey = key; };

        const handler = coverArt({
            http,
            finder: stubFinder({
                id: "abc",
                title: "Adventure",
                author: "Author",
                url: "http://ifarchive.org/adventure.z5",
                coverart: "https://ifdb.org/viewgame?coverart&id=abc",
                type: "zcode",
            }),
            illustration: new IllustrationHandler({ai: dumbAi as any}),
            ai: dumbAi,
            bucket,
        });

        const response = await handler(new Request("http://test/content/abc/cover-art"));
        expect(response.status).toBe(200);
        expect(fetchedUrl).toBe("https://ifdb.org/viewgame?coverart&id=abc");
        expect(savedKey).toBe("content/abc/cover-art-original");
    });

    test("falls back to original when style transfer fails with no-store to prevent caching", async () => {
        const failingAi: TalebraryAi = {
            generateText: async () => ({}) as any,
            generateImage: async () => { throw new Error("AI failed"); },
        };
        const handler = coverArt({
            http: async () => new Response("original image", {
                status: 200,
                headers: {"content-type": "image/png"},
            }),
            finder: stubFinder({
                id: "abc",
                title: "Adventure",
                author: "Author",
                url: "http://ifarchive.org/adventure.z5",
                coverart: "https://ifdb.org/viewgame?coverart&id=abc",
                type: "zcode",
            }),
            illustration: new IllustrationHandler({ai: dumbAi as any}),
            ai: failingAi,
            bucket: stubBucket(),
        });

        const response = await handler(new Request("http://test/content/abc/cover-art"));
        expect(response.status).toBe(200);
        expect(await response.text()).toBe("original image");
        expect(response.headers.get("cache-control")).toBe("no-store");
    });

    test("generates AI illustration when game has no coverart", async () => {
        const handler = coverArt({
            http: async () => new Response("", {status: 200}),
            finder: stubFinder({
                id: "abc",
                title: "Adventure",
                author: "Author",
                description: "A cave adventure",
                url: "http://ifarchive.org/adventure.z5",
                coverart: "",
                type: "zcode",
            }),
            illustration: new IllustrationHandler({ai: dumbAi as any}),
            ai: dumbAi,
            bucket: stubBucket(),
        });

        const response = await handler(new Request("http://test/content/abc/cover-art"));
        expect(response.headers.get("content-type")).toBe("image/jpeg");
    });

    test("returns 404 for unknown game", async () => {
        const handler = coverArt({
            http: async () => new Response("", {status: 200}),
            finder: stubFinder(null),
            illustration: new IllustrationHandler({ai: dumbAi as any}),
            ai: dumbAi,
            bucket: stubBucket(),
        });

        const response = await handler(new Request("http://test/content/unknown/cover-art"));
        expect(response.status).toBe(404);
    });
});
