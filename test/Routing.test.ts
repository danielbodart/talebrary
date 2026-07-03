import {describe, expect, test} from "bun:test";
import {Routing} from "../src/Routing.ts";
import type {RouterDependencies} from "../src/Routing.ts";

function stubHandler(name: string) {
    return {handle: async (_request: Request) => new Response(name, {status: 200})};
}

function stubBucket() {
    return {
        get: async (key: string) => new Response(`static:${key}`, {
            headers: {'content-type': 'text/html', 'etag': '"test"'},
        }),
        put: async () => {},
    };
}

function createRouting(overrides: Partial<RouterDependencies> = {}): Routing {
    return new Routing({
        bucket: stubBucket(),
        catalogue: stubHandler('catalogue') as any,
        coverArt: stubHandler('coverArt') as any,
        story: stubHandler('story') as any,
        content: stubHandler('content') as any,
        art: stubHandler('art') as any,
        suggestions: stubHandler('suggestions') as any,
        sitemap: stubHandler('sitemap') as any,
        robots: stubHandler('robots') as any,
        events: stubHandler('events') as any,
        ...overrides,
    } as any);
}

describe("Routing", () => {
    describe("catalogue routes", () => {
        test("/ routes to catalogue", async () => {
            const routing = createRouting();
            const response = await routing.handle(new Request("http://test/"));
            expect(await response.text()).toBe("catalogue");
        });

        test("/genres routes to catalogue", async () => {
            const routing = createRouting();
            const response = await routing.handle(new Request("http://test/genres"));
            expect(await response.text()).toBe("catalogue");
        });

        test("/genres/fantasy routes to catalogue", async () => {
            const routing = createRouting();
            const response = await routing.handle(new Request("http://test/genres/fantasy"));
            expect(await response.text()).toBe("catalogue");
        });

        test("/catalogue backwards-compat routes to catalogue", async () => {
            const routing = createRouting();
            const response = await routing.handle(new Request("http://test/catalogue"));
            expect(await response.text()).toBe("catalogue");
        });

        test("/catalogue/genres backwards-compat routes to catalogue", async () => {
            const routing = createRouting();
            const response = await routing.handle(new Request("http://test/catalogue/genres"));
            expect(await response.text()).toBe("catalogue");
        });
    });

    describe("content routes", () => {
        test("/content routes to catalogue", async () => {
            const routing = createRouting();
            const response = await routing.handle(new Request("http://test/content"));
            expect(await response.text()).toBe("catalogue");
        });

        test("/content/123 routes to content", async () => {
            const routing = createRouting();
            const response = await routing.handle(new Request("http://test/content/123"));
            expect(await response.text()).toBe("content");
        });

        test("/content/123/cover-art routes to coverArt", async () => {
            const routing = createRouting();
            const response = await routing.handle(new Request("http://test/content/123/cover-art"));
            expect(await response.text()).toBe("coverArt");
        });

        test("/content/123/art routes to art", async () => {
            const routing = createRouting();
            const response = await routing.handle(new Request("http://test/content/123/art"));
            expect(await response.text()).toBe("art");
        });

        test("/content/123/story routes to story", async () => {
            const routing = createRouting();
            const response = await routing.handle(new Request("http://test/content/123/story"));
            expect(await response.text()).toBe("story");
        });

        test("/content/123/suggestions routes to suggestions", async () => {
            const routing = createRouting();
            const response = await routing.handle(new Request("http://test/content/123/suggestions"));
            expect(await response.text()).toBe("suggestions");
        });
    });

    describe("cards routes", () => {
        test("/cards/art routes to art handler", async () => {
            const routing = createRouting();
            const response = await routing.handle(new Request("http://test/cards/art"));
            expect(await response.text()).toBe("art");
        });
    });

    describe("events routes", () => {
        test("/events routes to events handler", async () => {
            const routing = createRouting();
            const response = await routing.handle(new Request("http://test/events"));
            expect(await response.text()).toBe("events");
        });
    });

    describe("sitemap and robots routes", () => {
        test("/sitemap.xml routes to sitemap handler", async () => {
            const routing = createRouting();
            const response = await routing.handle(new Request("http://test/sitemap.xml"));
            expect(await response.text()).toBe("sitemap");
        });

        test("/robots.txt routes to robots handler", async () => {
            const routing = createRouting();
            const response = await routing.handle(new Request("http://test/robots.txt"));
            expect(await response.text()).toBe("robots");
        });
    });

    describe("static file fallback", () => {
        test("serves static files from bucket", async () => {
            const routing = createRouting();
            const response = await routing.handle(new Request("http://test/player/main.js"));
            expect(response.status).toBe(200);
        });

        test("unknown paths without file extension route to catalogue", async () => {
            const routing = createRouting();
            const response = await routing.handle(new Request("http://test/some/path"));
            expect(await response.text()).toBe("catalogue");
        });
    });
});
