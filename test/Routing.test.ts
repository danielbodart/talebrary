import {describe, expect, test} from "bun:test";
import {Routing} from "../src/Routing.ts";
import type {RouterDependencies} from "../src/Routing.ts";

function stubHandler(name: string) {
    return {handle: async (_request: Request) => new Response(name, {status: 200})};
}

function stubR2Bucket() {
    return {
        get: async (key: string) => ({
            body: `static:${key}`,
            writeHttpMetadata: (headers: Headers) => headers.set('content-type', 'text/html'),
            httpEtag: '"test"',
            checksums: {toJSON: () => ({})},
            customMetadata: {},
        }),
        put: async () => ({}),
    } as any;
}

function createRouting(overrides: Partial<RouterDependencies> = {}): Routing {
    return new Routing({
        r2: stubR2Bucket(),
        search: stubHandler('search') as any,
        coverArt: stubHandler('coverArt') as any,
        story: stubHandler('story') as any,
        content: stubHandler('content') as any,
        art: stubHandler('art') as any,
        suggestions: stubHandler('suggestions') as any,
        events: stubHandler('events') as any,
        atrium: stubHandler('atrium') as any,
        wing: stubHandler('wing') as any,
        aisle: stubHandler('aisle') as any,
        ...overrides,
    } as any);
}

describe("Routing", () => {
    describe("catalogue routes", () => {
        test("/ routes to atrium", async () => {
            const routing = createRouting();
            const response = await routing.handle(new Request("http://test/"));
            expect(await response.text()).toBe("atrium");
        });

        test("/catalogue routes to atrium", async () => {
            const routing = createRouting();
            const response = await routing.handle(new Request("http://test/catalogue"));
            expect(await response.text()).toBe("atrium");
        });

        test("/catalogue/genres routes to wing", async () => {
            const routing = createRouting();
            const response = await routing.handle(new Request("http://test/catalogue/genres"));
            expect(await response.text()).toBe("wing");
        });

        test("/catalogue/genres/fantasy routes to aisle", async () => {
            const routing = createRouting();
            const response = await routing.handle(new Request("http://test/catalogue/genres/fantasy"));
            expect(await response.text()).toBe("aisle");
        });
    });

    describe("content routes", () => {
        test("/content routes to search", async () => {
            const routing = createRouting();
            const response = await routing.handle(new Request("http://test/content"));
            expect(await response.text()).toBe("search");
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

    describe("static file fallback", () => {
        test("serves static files from R2", async () => {
            const routing = createRouting();
            const response = await routing.handle(new Request("http://test/player/main.js"));
            expect(response.status).toBe(200);
        });

        test("appends index.html to trailing slash paths", async () => {
            let requestedKey = '';
            const routing = createRouting({
                r2: {
                    get: async (key: string) => {
                        requestedKey = key;
                        return {
                            body: 'index',
                            writeHttpMetadata: () => {},
                            httpEtag: '"test"',
                            checksums: {toJSON: () => ({})},
                            customMetadata: {},
                        };
                    },
                    put: async () => ({}),
                } as any,
            });
            await routing.handle(new Request("http://test/some/path/"));
            expect(requestedKey).toBe("some/path/index.html");
        });
    });
});
