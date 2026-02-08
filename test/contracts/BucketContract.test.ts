import {describe, expect, test} from "bun:test";
import {FolderBucket} from "../../src/bun/buckets/FolderBucket.ts";
import {CloudflareR2Adapter} from "../../src/storage/CloudflareR2Adapter.ts";
import type {TalebraryBucket} from "../../src/storage/TalebraryBucket.ts";
import {mkdtemp, rm} from "fs/promises";
import {join} from "path";
import {tmpdir} from "os";

/**
 * Contract tests for TalebraryBucket implementations.
 *
 * Both FolderBucket and CloudflareR2Adapter (wrapping InMemoryR2Bucket)
 * must satisfy the same contract:
 * - get() returns 200 with body for existing keys
 * - get() returns 404 for missing keys
 * - get() returns 304 when conditional etag matches
 * - put() stores content retrievable by get()
 * - put() stores metadata as response headers
 */
function bucketContractTests(name: string, setup: () => Promise<{ bucket: TalebraryBucket, cleanup: () => Promise<void> }>) {
    describe(`${name} - TalebraryBucket contract`, () => {
        test("get returns 404 for missing key", async () => {
            const {bucket, cleanup} = await setup();
            const response = await bucket.get("nonexistent/key");
            expect(response.status).toBe(404);
            await cleanup();
        });

        test("put then get returns 200 with content", async () => {
            const {bucket, cleanup} = await setup();
            await bucket.put("test/hello", "hello world");
            const response = await bucket.get("test/hello");
            expect(response.status).toBe(200);
            expect(await response.text()).toBe("hello world");
            await cleanup();
        });

        test("put stores contentType as content-type header", async () => {
            const {bucket, cleanup} = await setup();
            await bucket.put("test/typed", "data", {contentType: "text/plain"});
            const response = await bucket.get("test/typed");
            expect(response.status).toBe(200);
            expect(response.headers.get("content-type")).toBe("text/plain");
            await cleanup();
        });

        test("put stores cacheControl as cache-control header", async () => {
            const {bucket, cleanup} = await setup();
            await bucket.put("test/cached", "data", {cacheControl: "public, max-age=60"});
            const response = await bucket.get("test/cached");
            expect(response.status).toBe(200);
            expect(response.headers.get("cache-control")).toBe("public, max-age=60");
            await cleanup();
        });

        test("get returns etag header", async () => {
            const {bucket, cleanup} = await setup();
            await bucket.put("test/etag", "content");
            const response = await bucket.get("test/etag");
            expect(response.status).toBe(200);
            const etag = response.headers.get("etag");
            expect(etag).not.toBeNull();
            expect(etag).toStartWith('"');
            expect(etag).toEndWith('"');
            await cleanup();
        });

        test("get with matching etag returns 304", async () => {
            const {bucket, cleanup} = await setup();
            await bucket.put("test/conditional", "content");
            const first = await bucket.get("test/conditional");
            const etag = first.headers.get("etag")!;

            const second = await bucket.get("test/conditional", {onlyIf: {etagDoesNotMatch: etag}});
            expect(second.status).toBe(304);
            await cleanup();
        });

        test("get with non-matching etag returns 200", async () => {
            const {bucket, cleanup} = await setup();
            await bucket.put("test/conditional2", "content");
            const response = await bucket.get("test/conditional2", {onlyIf: {etagDoesNotMatch: '"stale"'}});
            expect(response.status).toBe(200);
            expect(await response.text()).toBe("content");
            await cleanup();
        });

        test("put stores customMetadata retrievable via headers", async () => {
            const {bucket, cleanup} = await setup();
            await bucket.put("test/meta", "data", {
                contentType: "text/plain",
                customMetadata: {description: "test description"}
            });
            const response = await bucket.get("test/meta");
            expect(response.status).toBe(200);
            expect(response.headers.get("description")).toBe("test description");
            await cleanup();
        });
    });
}

// FolderBucket - filesystem-backed implementation
bucketContractTests("FolderBucket", async () => {
    const dir = await mkdtemp(join(tmpdir(), "bucket-contract-"));
    return {
        bucket: new FolderBucket(dir + "/"),
        cleanup: async () => { await rm(dir, {recursive: true}); }
    };
});

// CloudflareR2Adapter wrapping an in-memory R2Bucket
bucketContractTests("CloudflareR2Adapter", async () => {
    return {
        bucket: new CloudflareR2Adapter(new InMemoryR2Bucket() as any),
        cleanup: async () => {}
    };
});

/**
 * Minimal in-memory R2Bucket that implements just enough for CloudflareR2Adapter.
 */
class InMemoryR2Bucket {
    private store = new Map<string, { body: ArrayBuffer, httpMetadata: Record<string, string>, customMetadata: Record<string, string>, etag: string }>();

    async get(key: string, options?: any): Promise<any> {
        const entry = this.store.get(key);
        if (!entry) return null;

        const etagDoesNotMatch = options?.onlyIf?.etagDoesNotMatch;
        if (etagDoesNotMatch && etagDoesNotMatch === entry.etag) {
            // Etag matches — return metadata-only object (no body) for 304
            return {
                key,
                httpEtag: `"${entry.etag}"`,
                httpMetadata: {...entry.httpMetadata},
                customMetadata: {...entry.customMetadata},
                checksums: {toJSON: () => ({})},
                writeHttpMetadata(headers: Headers) {
                    for (const [k, v] of Object.entries(entry.httpMetadata)) {
                        if (v) headers.set(k, v);
                    }
                },
            };
        }

        // Return full object with body
        return {
            key,
            body: new ReadableStream({
                start(controller) {
                    controller.enqueue(new Uint8Array(entry.body));
                    controller.close();
                }
            }),
            httpEtag: `"${entry.etag}"`,
            httpMetadata: {...entry.httpMetadata},
            customMetadata: {...entry.customMetadata},
            checksums: {toJSON: () => ({})},
            writeHttpMetadata(headers: Headers) {
                for (const [k, v] of Object.entries(entry.httpMetadata)) {
                    if (v) headers.set(k, v);
                }
            },
        };
    }

    async put(key: string, value: any, options?: any): Promise<any> {
        let buffer: ArrayBuffer;
        if (typeof value === 'string') {
            buffer = new TextEncoder().encode(value).buffer;
        } else if (value instanceof ArrayBuffer) {
            buffer = value;
        } else if (value instanceof Uint8Array) {
            buffer = value.buffer as ArrayBuffer;
        } else {
            buffer = new ArrayBuffer(0);
        }

        const httpMetadata: Record<string, string> = {};
        if (options?.httpMetadata?.contentType) httpMetadata['content-type'] = options.httpMetadata.contentType;
        if (options?.httpMetadata?.cacheControl) httpMetadata['cache-control'] = options.httpMetadata.cacheControl;

        const etag = md5Hex(buffer);

        this.store.set(key, {
            body: buffer,
            httpMetadata,
            customMetadata: options?.customMetadata ?? {},
            etag,
        });

        return {key, httpEtag: `"${etag}"`, version: "1"};
    }
}

function md5Hex(buffer: ArrayBuffer): string {
    const hasher = new Bun.CryptoHasher("md5");
    hasher.update(buffer);
    return hasher.digest('hex');
}
