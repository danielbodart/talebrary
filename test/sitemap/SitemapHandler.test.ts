import {describe, expect, test} from "bun:test";
import {SitemapHandler, browsePaths} from "../../src/sitemap/SitemapHandler.ts";
import {InMemoryGameFinder} from "../../src/games/InMemoryGameFinder.ts";
import type {GameInfo} from "../../src/games/GameFinder.ts";

function game(id: string, playable: 1 | 0 = 1): GameInfo {
    return {id, title: id, author: 'A', rating: 0, rank: 0, boost: 0, score: 0, playable};
}

function handler(games: GameInfo[]): SitemapHandler {
    return new SitemapHandler({finder: new InMemoryGameFinder(games)});
}

describe("SitemapHandler", () => {
    test("serves application/xml", async () => {
        const response = await handler([]).handle(new Request("https://talebrary.test/sitemap.xml"));
        expect(response.headers.get('content-type')).toBe('application/xml');
    });

    test("emits a valid urlset", async () => {
        const xml = await (await handler([]).handle(new Request("https://talebrary.test/sitemap.xml"))).text();
        expect(xml).toStartWith('<?xml version="1.0" encoding="UTF-8"?>');
        expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
        expect(xml).toContain('</urlset>');
    });

    test("includes absolute story URLs for playable games only", async () => {
        const xml = await (await handler([game('abc'), game('def', 0)]).handle(
            new Request("https://talebrary.test/sitemap.xml"))).text();
        expect(xml).toContain('<loc>https://talebrary.test/content/abc</loc>');
        expect(xml).not.toContain('/content/def');
    });

    test("includes static browse pages", async () => {
        const xml = await (await handler([]).handle(new Request("https://talebrary.test/sitemap.xml"))).text();
        for (const path of browsePaths()) {
            expect(xml).toContain(`<loc>https://talebrary.test${path}</loc>`);
        }
    });

    test("derives origin from the request", async () => {
        const xml = await (await handler([game('abc')]).handle(
            new Request("http://localhost:3000/sitemap.xml"))).text();
        expect(xml).toContain('<loc>http://localhost:3000/content/abc</loc>');
    });
});

describe("browsePaths", () => {
    test("includes atrium and categories, but not the collapsed wings", () => {
        const paths = browsePaths();
        expect(paths).toContain('/');
        expect(paths).toContain('/genres/fantasy');
        expect(paths).toContain('/collections/top-rated');
        // Wing URLs 301 to the atrium, so they're kept out of the sitemap.
        expect(paths).not.toContain('/genres');
        expect(paths).not.toContain('/collections');
    });
});
