import {describe, expect, test} from "bun:test";
import {env} from 'bun';
import {FolderBucket} from "../../../src/local/buckets/FolderBucket.ts";

describe("FolderBucket", () => {
    const tmpdir = env.TMP_DIR ?? '/tmp/';
    const key = import.meta.file + 'tmp';

    test("can get an object", async () => {
        const key = import.meta.file;
        //TODO make this handle the slash
        const obj = await new FolderBucket(import.meta.dir + '/').get(key);
        expect(obj?.key).toBe(key);
        expect(await obj?.text()).not.toBeNull();
    });

    test("can put an object", async () => {
        const bucket = new FolderBucket(tmpdir);
        await bucket.put(key, 'test');
        const obj = await bucket.get(key);
        expect(await obj?.text()).toBe('test');
    });

    test("can store HTTP headers with object", async () => {
        const bucket = new FolderBucket(tmpdir);
        await bucket.put(key, 'test', {httpMetadata: {contentType: 'plain/text'}});
        const obj = await bucket.get(key);
        expect(obj?.httpMetadata?.contentType).toBe('plain/text');
    });
})
