import {describe, expect, test} from "bun:test";
import {coverArt} from "../../src/content/CoverArt.ts";
import type {GameFinder, GameStory} from "../../src/games/GameFinder.ts";
import type {Http} from "../../src/http/mod.ts";
import {DumbAi} from "../../src/bun/DumbAi.ts";
import type {TalebraryAi} from "../../src/ai/TalebraryAi.ts";
import {DirectRunner} from "../../src/workflows/mod.ts";
import {coverArtWorkflow} from "../../src/workflows/coverArt.ts";

function stubFinder(game: GameStory | null) {
    return {get: async () => game} as any as GameFinder;
}

function stubBucket() {
    return {
        get: async () => new Response(null, {status: 404}),
        put: async () => {},
    };
}

const dumbAi = new DumbAi();

function makeHandler(game: GameStory | null, http: Http = async () => new Response("image data", {status: 200, headers: {"content-type": "image/jpeg"}}), ai: TalebraryAi = dumbAi) {
    const bucket = stubBucket();
    return coverArt({
        finder: stubFinder(game),
        coverArtRunner: new DirectRunner(coverArtWorkflow({http, ai, bucket})),
    });
}

describe("coverArt", () => {
    test("style-transfers cover art when game has coverart URL", async () => {
        let fetchedUrl = '';
        const http: Http = async (request) => {
            fetchedUrl = request.url;
            return new Response("image data", {
                status: 200,
                headers: {"content-type": "image/jpeg"},
            });
        };

        const handler = makeHandler({
            id: "abc",
            title: "Adventure",
            author: "Author",
            url: "http://ifarchive.org/adventure.z5",
            coverart: "https://ifdb.org/viewgame?coverart&id=abc",
            type: "zcode",
        }, http);

        const response = await handler(new Request("http://test/content/abc/cover-art"));
        expect(response.status).toBe(200);
        expect(fetchedUrl).toBe("https://ifdb.org/viewgame?coverart&id=abc");
    });

    test("falls back to default artwork when both style transfer models fail", async () => {
        const failingAi: TalebraryAi = {
            generateText: async () => ({}) as any,
            generateImage: async (_model, input) => {
                if (input.sourceImage) throw new Error("AI failed");
                return new Uint8Array([1, 2, 3]);
            },
        };
        const handler = makeHandler({
            id: "abc",
            title: "Adventure",
            author: "Author",
            url: "http://ifarchive.org/adventure.z5",
            coverart: "https://ifdb.org/viewgame?coverart&id=abc",
            type: "zcode",
        }, async () => new Response("original image", {
            status: 200,
            headers: {"content-type": "image/png"},
        }), failingAi);

        const response = await handler(new Request("http://test/content/abc/cover-art"));
        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toBe("image/jpeg");
        expect(response.headers.get("description")).toContain("Adventure");
    });

    test("generates AI illustration when game has no coverart", async () => {
        const handler = makeHandler({
            id: "abc",
            title: "Adventure",
            author: "Author",
            description: "A cave adventure",
            url: "http://ifarchive.org/adventure.z5",
            coverart: "",
            type: "zcode",
        });

        const response = await handler(new Request("http://test/content/abc/cover-art"));
        expect(response.headers.get("content-type")).toBe("image/jpeg");
    });

    test("returns 404 for unknown game", async () => {
        const handler = makeHandler(null);

        const response = await handler(new Request("http://test/content/unknown/cover-art"));
        expect(response.status).toBe(404);
    });
});
