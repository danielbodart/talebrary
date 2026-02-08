import {describe, expect, test} from "bun:test";
import {unlink} from "node:fs/promises";
import {FolderBucket} from "../../../src/bun/buckets/FolderBucket.ts";

describe("FolderBucket", () => {
    const tmpdir = `/tmp/${import.meta.file}/`;

    test("can get an object", async () => {
        const key = import.meta.file;
        const response = await new FolderBucket(`${import.meta.dir}/`).get(key);
        expect(response.status).toBe(200);
        expect(await response.text()).not.toBeNull();
    });

    test("returns 404 for missing object", async () => {
        const response = await new FolderBucket(`${import.meta.dir}/`).get("nonexistent");
        expect(response.status).toBe(404);
    });

    test("can put an object", async () => {
        const key = `put.${Math.random()}.tmp`;
        const bucket = new FolderBucket(tmpdir);
        await bucket.put(key, 'test');
        const response = await bucket.get(key);
        expect(response.status).toBe(200);
        expect(await response.text()).toBe('test');
        await unlink(tmpdir + key);
    });

    test("can store HTTP metadata with object", async () => {
        const key = `store.${Math.random()}.tmp`;
        const bucket = new FolderBucket(tmpdir);
        await bucket.put(key, 'test', {contentType: 'plain/text'});
        const response = await bucket.get(key);
        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toBe('plain/text');
        await unlink(tmpdir + key);
    });
})
