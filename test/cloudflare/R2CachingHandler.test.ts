import {describe, expect, test} from "bun:test";
import {R2CachingHandler, unquote} from "../../src/cloudflare/R2CachingHandler.ts";
import {FolderBucket} from "../../src/bun/buckets/FolderBucket.ts";
import {mkdtemp, rm} from "fs/promises";
import {join} from "path";
import {tmpdir} from "os";
import type {Digest} from "../../src/system/digest.ts";

const fixedDigest: Digest = () => "abc123";

async function createTempBucket() {
    const dir = await mkdtemp(join(tmpdir(), "r2-cache-test-"));
    return {bucket: new FolderBucket(dir), dir};
}

describe("R2CachingHandler", () => {
    test("cache miss: calls wrapped handler and caches result", async () => {
        const {bucket, dir} = await createTempBucket();
        let called = false;
        const handler = new R2CachingHandler({r2: bucket as any, digest: fixedDigest}, async () => {
            called = true;
            return new Response("fresh content", {
                status: 200,
                headers: {"content-type": "text/plain"},
            });
        });

        const response = await handler.handle(new Request("http://test/content/123/art"));
        expect(called).toBe(true);
        expect(response.status).toBe(200);
        expect(await response.text()).toBe("fresh content");

        await rm(dir, {recursive: true});
    });

    test("cache hit: returns cached content without calling wrapped handler", async () => {
        const {bucket, dir} = await createTempBucket();
        let callCount = 0;
        const handler = new R2CachingHandler({r2: bucket as any, digest: fixedDigest}, async () => {
            callCount++;
            return new Response("fresh content", {
                status: 200,
                headers: {"content-type": "text/plain"},
            });
        });

        // First call: populates cache
        await handler.handle(new Request("http://test/content/123/story"));
        // Second call: should hit cache
        const response = await handler.handle(new Request("http://test/content/123/story"));
        expect(callCount).toBe(1);
        expect(response.status).toBe(200);

        await rm(dir, {recursive: true});
    });

    test("does not cache error responses", async () => {
        const {bucket, dir} = await createTempBucket();
        let callCount = 0;
        const handler = new R2CachingHandler({r2: bucket as any, digest: fixedDigest}, async () => {
            callCount++;
            return new Response("not found", {status: 404});
        });

        await handler.handle(new Request("http://test/content/123/story"));
        await handler.handle(new Request("http://test/content/123/story"));
        expect(callCount).toBe(2);

        await rm(dir, {recursive: true});
    });

    test("reload parameter bypasses cache", async () => {
        const {bucket, dir} = await createTempBucket();
        let callCount = 0;
        const handler = new R2CachingHandler({r2: bucket as any, digest: fixedDigest}, async () => {
            callCount++;
            return new Response(`content-${callCount}`, {
                status: 200,
                headers: {"content-type": "text/plain"},
            });
        });

        await handler.handle(new Request("http://test/content/123/art"));
        const response = await handler.handle(new Request("http://test/content/123/art?reload"));
        expect(callCount).toBe(2);
        expect(await response.text()).toBe("content-2");

        await rm(dir, {recursive: true});
    });

    test("different query params get different cache keys", async () => {
        const {bucket, dir} = await createTempBucket();
        let lastPrompt = '';
        const handler = new R2CachingHandler({r2: bucket as any, digest: async (buf) => {
            const text = new TextDecoder().decode(new Uint8Array(buf));
            return text;
        }}, async (request) => {
            lastPrompt = new URL(request.url).searchParams.get('prompt') ?? '';
            return new Response(`result-${lastPrompt}`, {
                status: 200,
                headers: {"content-type": "text/plain"},
            });
        });

        await handler.handle(new Request("http://test/content/123/art?prompt=cat"));
        await handler.handle(new Request("http://test/content/123/art?prompt=dog"));
        expect(lastPrompt).toBe("dog"); // both should have been called

        await rm(dir, {recursive: true});
    });
});

describe("unquote", () => {
    test("removes all quotes from etag", () => {
        expect(unquote('"abc123"')).toBe("abc123");
    });

    test("handles unquoted string", () => {
        expect(unquote("abc123")).toBe("abc123");
    });
});
