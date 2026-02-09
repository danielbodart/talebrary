import {describe, expect, test} from "bun:test";
import {story} from "../../src/content/Story.ts";
import type {GameFinder, GameStory} from "../../src/games/GameFinder.ts";
import type {Http} from "../../src/http/mod.ts";

function stubFinder(game: GameStory | null) {
    return {get: async () => game} as any as GameFinder;
}

describe("story", () => {
    test("fetches story URL for known game", async () => {
        let fetchedUrl = '';
        const http: Http = async (request) => {
            fetchedUrl = request.url;
            return new Response("story data", {status: 200});
        };
        const handler = story({
            http,
            finder: stubFinder({
                id: "abc",
                title: "Adventure",
                author: "Author",
                url: "http://ifarchive.org/games/adventure.z5",
                coverart: "",
                type: "zcode",
            })
        });

        const response = await handler(new Request("http://test/content/abc/story"));
        expect(response.status).toBe(200);
        expect(fetchedUrl).toBe("http://ifarchive.org/games/adventure.z5");
    });

    test("returns 404 for unknown game", async () => {
        const handler = story({
            http: async () => new Response("", {status: 200}),
            finder: stubFinder(null),
        });

        const response = await handler(new Request("http://test/content/unknown/story"));
        expect(response.status).toBe(404);
    });
});
