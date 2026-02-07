import {describe, expect, test} from "bun:test";
import {cacheControlHandler, CacheControl} from "../../src/http/CacheControl.ts";

describe("CacheControl", () => {
    test("sets cache-control on successful GET", async () => {
        const handler = cacheControlHandler(async () =>
            new Response("ok", {status: 200}));

        const response = await handler(new Request("http://test/page"));
        expect(response.headers.get("cache-control")).toBe(CacheControl.Public);
    });

    test("does not override private cache-control", async () => {
        const handler = cacheControlHandler(async () =>
            new Response("ok", {status: 200, headers: {"cache-control": "private, max-age=0"}}));

        const response = await handler(new Request("http://test/page"));
        expect(response.headers.get("cache-control")).toBe("private, max-age=0");
    });

    test("does not set cache-control on error responses", async () => {
        const handler = cacheControlHandler(async () =>
            new Response("not found", {status: 404}));

        const response = await handler(new Request("http://test/page"));
        expect(response.headers.get("cache-control")).toBeNull();
    });

    test("does not set cache-control on POST requests", async () => {
        const handler = cacheControlHandler(async () =>
            new Response("ok", {status: 200}));

        const response = await handler(new Request("http://test/page", {method: "POST"}));
        expect(response.headers.get("cache-control")).toBeNull();
    });
});
