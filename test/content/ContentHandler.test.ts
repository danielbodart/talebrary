import {describe, expect, test} from "bun:test";
import {ContentHandler, render} from "../../src/content/ContentHandler.tsx";
import type {GameStory} from "../../src/cloudflare/D1GameFinder.ts";

const testGame: GameStory = {
    id: "abc123",
    title: "Adventure",
    author: "William Crowther",
    description: "Explore Colossal Cave",
    url: "http://ifarchive.org/adventure.z5",
    coverart: "https://ifdb.org/coverart&id=abc123",
    type: "zcode",
};

describe("ContentHandler", () => {
    test("returns game page for valid id", async () => {
        const handler = new ContentHandler({
            finder: {get: async () => testGame} as any,
        });
        const response = await handler.handle(new Request("http://test/content/abc123"));
        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toBe("text/html");
        const html = await response.text();
        expect(html).toContain("Adventure");
        expect(html).toContain("William Crowther");
    });

    test("returns 404 for unknown game", async () => {
        const handler = new ContentHandler({
            finder: {get: async () => null} as any,
        });
        const response = await handler.handle(new Request("http://test/content/unknown"));
        expect(response.status).toBe(404);
    });
});

describe("render", () => {
    test("generates HTML with game details", () => {
        const html = render(testGame);
        expect(html).toContain("Adventure");
        expect(html).toContain("William Crowther");
        expect(html).toContain("/content/abc123/cover-art");
        expect(html).toContain("/content/abc123/story");
        expect(html).toContain('data-type="zcode"');
    });

    test("includes template meta tag", () => {
        const html = render(testGame);
        expect(html).toContain('name="template"');
        expect(html).toContain('content="card"');
    });

    test("includes player script", () => {
        const html = render(testGame);
        expect(html).toContain("/player/main.js");
    });

    test("cover art uses x-image custom element with reloadable", () => {
        const html = render(testGame);
        expect(html).toContain('is="x-image"');
        expect(html).toContain('reloadable');
    });
});
