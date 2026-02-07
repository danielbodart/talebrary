import {describe, expect, test} from "bun:test";
import {etagHandler, strongEtag} from "../../src/http/EtagHandler.ts";
import type {Digest} from "../../src/system/digest.ts";

const fixedDigest: Digest = () => "abc123";

describe("EtagHandler", () => {
    test("adds etag header to GET responses", async () => {
        const handler = etagHandler(fixedDigest, async () =>
            new Response("hello", {status: 200}));

        const response = await handler(new Request("http://test/page"));
        expect(response.headers.get("etag")).toBe('"abc123"');
        expect(await response.text()).toBe("hello");
    });

    test("returns 304 when if-none-match matches computed etag", async () => {
        const handler = etagHandler(fixedDigest, async () =>
            new Response("hello", {status: 200}));

        const request = new Request("http://test/page", {
            headers: {"if-none-match": '"abc123"'}
        });
        const response = await handler(request);
        expect(response.status).toBe(304);
        expect(await response.text()).toBe("");
    });

    test("returns 304 when if-none-match matches existing etag header", async () => {
        const handler = etagHandler(fixedDigest, async () =>
            new Response("hello", {status: 200, headers: {etag: '"abc123"'}}));

        const request = new Request("http://test/page", {
            headers: {"if-none-match": '"abc123"'}
        });
        const response = await handler(request);
        expect(response.status).toBe(304);
    });

    test("passes through non-GET requests unchanged", async () => {
        const handler = etagHandler(fixedDigest, async () =>
            new Response("created", {status: 201}));

        const response = await handler(new Request("http://test/page", {method: "POST"}));
        expect(response.status).toBe(201);
        expect(response.headers.get("etag")).toBeNull();
    });

    test("passes through error responses unchanged", async () => {
        const handler = etagHandler(fixedDigest, async () =>
            new Response("not found", {status: 404}));

        const response = await handler(new Request("http://test/page"));
        expect(response.status).toBe(404);
        expect(response.headers.get("etag")).toBeNull();
    });

    test("preserves safe headers on 304 response", async () => {
        const handler = etagHandler(fixedDigest, async () =>
            new Response("hello", {
                status: 200,
                headers: {"cache-control": "public, max-age=60", "x-custom": "dropped"}
            }));

        const request = new Request("http://test/page", {
            headers: {"if-none-match": '"abc123"'}
        });
        const response = await handler(request);
        expect(response.status).toBe(304);
        expect(response.headers.get("cache-control")).toBe("public, max-age=60");
        expect(response.headers.get("x-custom")).toBeNull();
    });
});

describe("strongEtag", () => {
    test("wraps value in double quotes", () => {
        expect(strongEtag("abc")).toBe('"abc"');
    });
});
