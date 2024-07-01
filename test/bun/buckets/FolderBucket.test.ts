import {describe, expect, test} from "bun:test";
import {unlink} from "node:fs/promises";
import {FolderBucket} from "../../../src/bun/buckets/FolderBucket.ts";

describe("FolderBucket", () => {
    const tmpdir = `/tmp/${import.meta.file}/`;

    test("can get an object", async () => {
        const key = import.meta.file;
        //TODO make this handle the slash
        const obj = await new FolderBucket(`${import.meta.dir}/`).get(key);
        expect(obj?.key).toBe(key);
        expect(await obj?.text()).not.toBeNull();
    });

    test("can put an object", async () => {
        const key = `put.${Math.random()}.tmp`;
        const bucket = new FolderBucket(tmpdir);
        await bucket.put(key, 'test');
        const obj = await bucket.get(key);
        expect(await obj?.text()).toBe('test');
        await unlink(tmpdir + key);
    });

    test("can store HTTP headers with object", async () => {
        const key = `store.${Math.random()}.tmp`;
        const bucket = new FolderBucket(tmpdir);
        await bucket.put(key, 'test', {httpMetadata: {contentType: 'plain/text'}});
        const obj = await bucket.get(key);
        expect(obj?.httpMetadata?.contentType).toBe('plain/text');
        await unlink(tmpdir + key);
    });
})
