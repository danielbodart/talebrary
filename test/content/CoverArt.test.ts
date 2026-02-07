import {describe, expect, test} from "bun:test";
import {coverArt} from "../../src/content/CoverArt.ts";
import {IllustrationHandler} from "../../src/content/IllustrationHandler.ts";
import type {D1GameFinder, GameStory} from "../../src/cloudflare/D1GameFinder.ts";
import type {Http} from "../../src/http/mod.ts";
import {DumbAi} from "../../src/bun/DumbAi.ts";

function stubFinder(game: GameStory | null): D1GameFinder {
    return {get: async () => game} as any;
}

describe("coverArt", () => {
    test("fetches external cover art URL when game has coverart", async () => {
        let fetchedUrl = '';
        const http: Http = async (request) => {
            fetchedUrl = request.url;
            return new Response("image data", {
                status: 200,
                headers: {"content-type": "image/jpeg"},
            });
        };
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
            illustration: new IllustrationHandler({ai: new DumbAi() as any}),
        });

        const response = await handler(new Request("http://test/content/abc/cover-art"));
        expect(response.status).toBe(200);
        expect(fetchedUrl).toBe("https://ifdb.org/viewgame?coverart&id=abc");
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
            illustration: new IllustrationHandler({ai: new DumbAi() as any}),
        });

        const response = await handler(new Request("http://test/content/abc/cover-art"));
        expect(response.headers.get("content-type")).toBe("image/jpeg");
    });

    test("returns 404 for unknown game", async () => {
        const handler = coverArt({
            http: async () => new Response("", {status: 200}),
            finder: stubFinder(null),
            illustration: new IllustrationHandler({ai: new DumbAi() as any}),
        });

        const response = await handler(new Request("http://test/content/unknown/cover-art"));
        expect(response.status).toBe(404);
    });
});
