import {describe, expect, test} from "bun:test";
import {story} from "../../src/content/Story.ts";
import type {GameFinder, GameStory} from "../../src/games/GameFinder.ts";
import type {Http} from "../../src/http/mod.ts";

function stubFinder(game: GameStory | null) {
    return {get: async () => game} as any as GameFinder;
}

// Empty but valid wasm module (\0asm + version). These tests use non-AGT games,
// so the converter is never invoked; the module only satisfies the dependency.
const agtModule = new WebAssembly.Module(new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]));

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
            }),
            agtModule,
        });

        const response = await handler(new Request("http://test/content/abc/story"));
        expect(response.status).toBe(200);
        expect(fetchedUrl).toBe("http://ifarchive.org/games/adventure.z5");
    });

    test("returns 404 for unknown game", async () => {
        const handler = story({
            http: async () => new Response("", {status: 200}),
            finder: stubFinder(null),
            agtModule,
        });

        const response = await handler(new Request("http://test/content/unknown/story"));
        expect(response.status).toBe(404);
    });
});
