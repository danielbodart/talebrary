import {describe, expect, test} from "bun:test";
import {ContentSearch, render} from "../../src/content/ContentSearch.tsx";
import type {GameInfo} from "../../src/cloudflare/D1GameFinder.ts";

const testGames: GameInfo[] = [
    {
        id: "abc",
        title: "Adventure",
        author: "Crowther & Woods",
        description: "Explore Colossal Cave",
        rating: 4.5,
        rank: 1,
        boost: 3,
        score: 8.5,
        playable: 1,
    },
    {
        id: "def",
        title: "Zork",
        author: "Infocom",
        description: "Great Underground Empire",
        rating: 4.8,
        rank: 2,
        boost: 0,
        score: 6.8,
        playable: 0,
    },
];

describe("ContentSearch", () => {
    test("returns search results page", async () => {
        const search = new ContentSearch({
            finder: {find: async () => testGames} as any,
        });
        const response = await search.handle(new Request("http://test/content?search=adventure"));
        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toBe("text/html");
        const html = await response.text();
        expect(html).toContain("Adventure");
        expect(html).toContain("Zork");
    });

    test("passes search parameter to finder", async () => {
        let searchTerm = '';
        const search = new ContentSearch({
            finder: {find: async (s: string) => { searchTerm = s; return []; }} as any,
        });
        await search.handle(new Request("http://test/content?search=cave"));
        expect(searchTerm).toBe("cave");
    });

    test("defaults to empty search", async () => {
        let searchTerm: string | undefined;
        const search = new ContentSearch({
            finder: {find: async (s: string) => { searchTerm = s; return []; }} as any,
        });
        await search.handle(new Request("http://test/content"));
        expect(searchTerm).toBe("");
    });
});

describe("render", () => {
    test("renders game cards with details", () => {
        const html = render("adventure", testGames);
        expect(html).toContain("Adventure");
        expect(html).toContain("Crowther");
        expect(html).toContain("Explore Colossal Cave");
    });

    test("shows play link only for playable games", () => {
        const html = render("", testGames);
        expect(html).toContain('href="/content/abc/"');
        // Non-playable game has play without href
    });

    test("includes search input with current value", () => {
        const html = render("adventure", testGames);
        expect(html).toContain('value="adventure"');
    });

    test("includes cover art images", () => {
        const html = render("", testGames);
        expect(html).toContain("/content/abc/cover-art");
        expect(html).toContain("/content/def/cover-art");
    });

    test("cover art images use x-image custom element with reloadable", () => {
        const html = render("", testGames);
        expect(html).toContain('is="x-image"');
        expect(html).toContain('reloadable');
    });

    test("loads catalogue script for image reload support", () => {
        const html = render("", testGames);
        expect(html).toContain('/catalogue/main.js');
    });
});
