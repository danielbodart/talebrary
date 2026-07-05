import {describe, expect, test} from "bun:test";
import {CatalogueHandler} from "../../src/catalogue/CatalogueHandler.tsx";
import {SqlGameFinder} from "../../src/games/SqlGameFinder.ts";
import {talebrary} from "../../src/bun/SqliteDatabase.ts";

describe("CatalogueHandler", () => {
    const db = talebrary();
    const finder = new SqlGameFinder({db});
    const handler = new CatalogueHandler({finder});

    describe("atrium", () => {
        test("renders homepage with wings", async () => {
            const response = await handler.handle(new Request("http://test/"));
            expect(response.status).toBe(200);
            const html = await response.text();
            expect(html).toContain("The Talebrary Athenaeum");
            expect(html).toContain("The Atrium");
            expect(html).toContain("/genres");
            expect(html).toContain("/collections");
        });

        test("renders go… group with exits as leaf commands", async () => {
            const response = await handler.handle(new Request("http://test/"));
            const html = await response.text();
            expect(html).toContain("go…");
            expect(html).toContain('data-command="go genres"');
            expect(html).toContain('data-command="go collections"');
        });

        test("offers talking to the librarian (topics surface once in conversation)", async () => {
            const response = await handler.handle(new Request("http://test/"));
            const html = await response.text();
            expect(html).toContain('data-command="talk librarian"');
        });

        test("illustration uses x-image custom element with reloadable", async () => {
            const response = await handler.handle(new Request("http://test/"));
            const html = await response.text();
            expect(html).toContain('is="x-image"');
            expect(html).toContain('reloadable');
        });

        test("breadcrumb shows atrium only", async () => {
            const response = await handler.handle(new Request("http://test/"));
            const html = await response.text();
            expect(html).toContain('"name":"Atrium"');
        });

        test("/catalogue path still resolves to atrium", async () => {
            const response = await handler.handle(new Request("http://test/catalogue"));
            expect(response.status).toBe(200);
            const html = await response.text();
            expect(html).toContain("The Atrium");
        });

        test("scene card has scroll class", async () => {
            const response = await handler.handle(new Request("http://test/"));
            const html = await response.text();
            expect(html).toContain('scene-card scroll');
        });
    });

    describe("wing", () => {
        test("renders genres wing", async () => {
            const response = await handler.handle(new Request("http://test/genres"));
            expect(response.status).toBe(200);
            const html = await response.text();
            expect(html).toContain("Genre Wings");
            expect(html).toContain("/genres/fantasy");
        });

        test("renders collections wing", async () => {
            const response = await handler.handle(new Request("http://test/collections"));
            expect(response.status).toBe(200);
            const html = await response.text();
            expect(html).toContain("Special Collections");
            expect(html).toContain("/collections/top-rated");
        });

        test("has go back exit", async () => {
            const response = await handler.handle(new Request("http://test/genres"));
            const html = await response.text();
            expect(html).toContain("go back");
        });

        test("returns 404 for unknown wing", async () => {
            const response = await handler.handle(new Request("http://test/unknown"));
            expect(response.status).toBe(404);
        });

        test("breadcrumb shows atrium and wing", async () => {
            const response = await handler.handle(new Request("http://test/genres"));
            const html = await response.text();
            expect(html).toContain('"name":"Atrium"');
            expect(html).toContain('"item":"/"');
            expect(html).toContain('"name":"Genre Wings"');
        });

        test("/catalogue/genres still resolves", async () => {
            const response = await handler.handle(new Request("http://test/catalogue/genres"));
            expect(response.status).toBe(200);
            const html = await response.text();
            expect(html).toContain("Genre Wings");
        });
    });

    describe("aisle", () => {
        test("renders fantasy aisle with games", async () => {
            const response = await handler.handle(new Request("http://test/genres/fantasy"));
            expect(response.status).toBe(200);
            const html = await response.text();
            expect(html).toContain("Fantasy Aisle");
            expect(html).toContain("Dragons, wizards");
            expect(html).toContain('class="play"');
        });

        test("has go back exit", async () => {
            const response = await handler.handle(new Request("http://test/genres/fantasy"));
            const html = await response.text();
            expect(html).toContain("go back");
        });

        test("cover art images use x-image custom element with reloadable", async () => {
            const response = await handler.handle(new Request("http://test/genres/fantasy"));
            const html = await response.text();
            expect(html).toContain('is="x-image"');
            expect(html).toContain('reloadable');
        });

        test("renders top-rated collection with games", async () => {
            const response = await handler.handle(new Request("http://test/collections/top-rated"));
            expect(response.status).toBe(200);
            const html = await response.text();
            expect(html).toContain("Highest Rated");
            expect(html).toContain('class="play"');
        });

        test("renders classics collection with hand-picked games", async () => {
            const response = await handler.handle(new Request("http://test/collections/classics"));
            expect(response.status).toBe(200);
            const html = await response.text();
            expect(html).toContain("Classics");
            expect(html).toContain("weathered volumes");
        });

        test("returns 404 for unknown wing", async () => {
            const response = await handler.handle(new Request("http://test/unknown/fantasy"));
            expect(response.status).toBe(404);
        });

        test("returns 404 for unknown category", async () => {
            const response = await handler.handle(new Request("http://test/genres/unknown"));
            expect(response.status).toBe(404);
        });

        test("breadcrumb shows atrium, wing and aisle", async () => {
            const response = await handler.handle(new Request("http://test/genres/horror"));
            const html = await response.text();
            expect(html).toContain('"name":"Atrium"');
            expect(html).toContain('"item":"/"');
            expect(html).toContain('"item":"/genres"');
            expect(html).toContain('"name":"Horror Aisle"');
        });

        test("/catalogue/genres/fantasy still resolves", async () => {
            const response = await handler.handle(new Request("http://test/catalogue/genres/fantasy"));
            expect(response.status).toBe(200);
            const html = await response.text();
            expect(html).toContain("Fantasy Aisle");
        });

        test("prefixed path shows the aisle's own suggestions, not the atrium's", async () => {
            const response = await handler.handle(new Request("http://test/catalogue/genres/fantasy"));
            const html = await response.text();
            expect(html).toContain("go…");
            // the atrium-only "talk librarian" chip must not leak onto an aisle page
            expect(html).not.toContain('data-command="talk librarian"');
        });
    });

    describe("inline search", () => {
        test("atrium search returns games", async () => {
            const response = await handler.handle(new Request("http://test/?search=adventure"));
            expect(response.status).toBe(200);
            const html = await response.text();
            expect(html).toContain("The Atrium");
            expect(html).toContain("librarian");
        });

        test("/content/?search=X routes to catalogue with search", async () => {
            const response = await handler.handle(new Request("http://test/content/?search=zork"));
            expect(response.status).toBe(200);
            const html = await response.text();
            expect(html).toContain("The Atrium");
        });

        test("search input preserves search value", async () => {
            const response = await handler.handle(new Request("http://test/?search=adventure"));
            const html = await response.text();
            expect(html).toContain('value="adventure"');
        });

        test("librarian response shown for search", async () => {
            const response = await handler.handle(new Request("http://test/?search=zork"));
            const html = await response.text();
            expect(html).toContain("librarian");
            expect(html).toContain("librarian-card");
        });
    });
});
