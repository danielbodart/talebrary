import {describe, expect, test} from "bun:test";
import {AtriumHandler} from "../../src/catalogue/AtriumHandler.tsx";
import {WingHandler} from "../../src/catalogue/WingHandler.tsx";
import {AisleHandler} from "../../src/catalogue/AisleHandler.tsx";
import {SqlGameFinder} from "../../src/games/SqlGameFinder.ts";
import {talebrary} from "../../src/bun/SqliteDatabase.ts";

describe("CatalogueHandlers", () => {
    const db = talebrary();
    const finder = new SqlGameFinder({db});

    describe("AtriumHandler", () => {
        const handler = new AtriumHandler();

        test("renders homepage with wings", async () => {
            const response = await handler.handle(new Request("http://test/catalogue"));
            expect(response.status).toBe(200);
            const html = await response.text();
            expect(html).toContain("The Talebrary Athenaeum");
            expect(html).toContain("The Atrium");
            expect(html).toContain("/catalogue/genres");
            expect(html).toContain("/catalogue/collections");
            expect(html).toContain("go genres");
            expect(html).toContain("go collections");
        });

        test("illustration uses x-image custom element with reloadable", async () => {
            const response = await handler.handle(new Request("http://test/catalogue"));
            const html = await response.text();
            expect(html).toContain('is="x-image"');
            expect(html).toContain('reloadable');
        });
    });

    describe("WingHandler", () => {
        const handler = new WingHandler();

        test("renders genres wing", async () => {
            const response = await handler.handle(new Request("http://test/catalogue/genres"));
            expect(response.status).toBe(200);
            const html = await response.text();
            expect(html).toContain("Genre Wings");
            expect(html).toContain("/catalogue/genres/fantasy");
            expect(html).toContain("go fantasy");
            expect(html).toContain("go back");
        });

        test("renders collections wing", async () => {
            const response = await handler.handle(new Request("http://test/catalogue/collections"));
            expect(response.status).toBe(200);
            const html = await response.text();
            expect(html).toContain("Special Collections");
            expect(html).toContain("/catalogue/collections/top-rated");
        });

        test("returns 404 for unknown wing", async () => {
            const response = await handler.handle(new Request("http://test/catalogue/unknown"));
            expect(response.status).toBe(404);
        });
    });

    describe("AisleHandler", () => {
        const handler = new AisleHandler({finder});

        test("renders fantasy aisle with games", async () => {
            const response = await handler.handle(new Request("http://test/catalogue/genres/fantasy"));
            expect(response.status).toBe(200);
            const html = await response.text();
            expect(html).toContain("Fantasy Aisle");
            expect(html).toContain("Dragons, wizards");
            expect(html).toContain("go back");
            expect(html).toContain('class="play"');
        });

        test("cover art images use x-image custom element with reloadable", async () => {
            const response = await handler.handle(new Request("http://test/catalogue/genres/fantasy"));
            const html = await response.text();
            expect(html).toContain('is="x-image"');
            expect(html).toContain('reloadable');
        });

        test("renders top-rated collection with games", async () => {
            const response = await handler.handle(new Request("http://test/catalogue/collections/top-rated"));
            expect(response.status).toBe(200);
            const html = await response.text();
            expect(html).toContain("Highest Rated");
            expect(html).toContain('class="play"');
        });

        test("renders classics collection with hand-picked games", async () => {
            const response = await handler.handle(new Request("http://test/catalogue/collections/classics"));
            expect(response.status).toBe(200);
            const html = await response.text();
            expect(html).toContain("Classics");
            expect(html).toContain("weathered volumes");
        });

        test("returns 404 for unknown wing", async () => {
            const response = await handler.handle(new Request("http://test/catalogue/unknown/fantasy"));
            expect(response.status).toBe(404);
        });

        test("returns 404 for unknown category", async () => {
            const response = await handler.handle(new Request("http://test/catalogue/genres/unknown"));
            expect(response.status).toBe(404);
        });

        test("aisle page has breadcrumb navigation", async () => {
            const response = await handler.handle(new Request("http://test/catalogue/genres/horror"));
            const html = await response.text();
            expect(html).toContain('application/ld+json');
            expect(html).toContain('"name":"Atrium"');
            expect(html).toContain('"item":"/catalogue"');
            expect(html).toContain('"item":"/catalogue/genres"');
            expect(html).toContain('"name":"Horror Aisle"');
        });
    });
});
