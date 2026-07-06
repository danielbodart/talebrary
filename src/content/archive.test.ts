import {describe, expect, test} from "bun:test";
import {gzipSync, zipSync} from "fflate";
import {detectArchive, extractStory} from "./archive.ts";

// A z-code story: first byte is the version (0x05), realistic length (>512).
const zcode = new Uint8Array([0x05, ...new Array(1023).fill(0x41)]);
// A glulx story: 'Glul' magic.
const glulx = new Uint8Array([0x47, 0x6c, 0x75, 0x6c, ...new Array(1020).fill(0x42)]);

const bytes = (b: ArrayBuffer | null) => (b ? new Uint8Array(b) : null);

function tar(files: Record<string, Uint8Array>): Uint8Array {
    const blocks: Uint8Array[] = [];
    for (const [name, data] of Object.entries(files)) {
        const h = new Uint8Array(512);
        for (let i = 0; i < name.length; i++) h[i] = name.charCodeAt(i);
        const oct = data.length.toString(8).padStart(11, "0");
        for (let i = 0; i < 11; i++) h[124 + i] = oct.charCodeAt(i);
        h[135] = 0x20;
        h[156] = 0x30; // '0' = regular file
        for (let i = 0; i < 6; i++) h[257 + i] = "ustar\0".charCodeAt(i);
        blocks.push(h);
        const padded = new Uint8Array(Math.ceil(data.length / 512) * 512);
        padded.set(data);
        blocks.push(padded);
    }
    blocks.push(new Uint8Array(1024)); // end-of-archive
    const out = new Uint8Array(blocks.reduce((n, b) => n + b.length, 0));
    let o = 0;
    for (const b of blocks) { out.set(b, o); o += b.length; }
    return out;
}

describe("detectArchive", () => {
    test("recognises zip, gzip, tar; ignores bare files", () => {
        expect(detectArchive(zipSync({"g.z5": zcode}))).toBe("zip");
        expect(detectArchive(gzipSync(zcode))).toBe("gzip");
        expect(detectArchive(tar({"g.z5": zcode}))).toBe("tar");
        expect(detectArchive(zcode)).toBeNull();
    });
});

describe("extractStory", () => {
    test("zip: pulls the story out past a readme", async () => {
        const zip = zipSync({"readme.txt": new Uint8Array([1, 2, 3]), "game.z5": zcode});
        expect(bytes(await extractStory(zip, "zip", "zcode"))).toEqual(zcode);
    });

    test("zip: prefers the member matching the IFDB format", async () => {
        const zip = zipSync({"a.z5": zcode, "b.ulx": glulx});
        expect(bytes(await extractStory(zip, "zip", "glulx"))).toEqual(glulx);
        expect(bytes(await extractStory(zip, "zip", "blorb/zcode"))).toEqual(zcode);
    });

    test("zip: largest wins when several match the format", async () => {
        const small = new Uint8Array([0x05, 9]);
        const big = new Uint8Array([0x05, ...new Array(500).fill(7)]);
        const zip = zipSync({"small.z5": small, "big.z5": big});
        expect(bytes(await extractStory(zip, "zip", "zcode"))).toEqual(big);
    });

    test("zip: no story file returns null (not cached)", async () => {
        const zip = zipSync({"readme.txt": new Uint8Array([1]), "cover.jpg": new Uint8Array([2])});
        expect(await extractStory(zip, "zip", "zcode")).toBeNull();
    });

    test("gzip: plain single-stream is the story itself", async () => {
        expect(bytes(await extractStory(gzipSync(zcode), "gzip", "zcode"))).toEqual(zcode);
    });

    test("tar.gz: gunzips then pulls the story", async () => {
        const targz = gzipSync(tar({"notes.txt": new Uint8Array([1]), "game.ulx": glulx}));
        expect(bytes(await extractStory(targz, "gzip", "glulx"))).toEqual(glulx);
    });

    test("tar: pulls the story", async () => {
        expect(bytes(await extractStory(tar({"game.z5": zcode}), "tar", "zcode"))).toEqual(zcode);
    });

    test("falls back to magic-byte detection when no story extension", async () => {
        const zip = zipSync({"story": zcode, "readme": new Uint8Array([1, 2, 3, 4])});
        expect(bytes(await extractStory(zip, "zip", "zcode"))).toEqual(zcode);
    });

    test("malformed/truncated archive returns null (never throws)", async () => {
        const truncatedZip = zipSync({"game.z5": zcode}).subarray(0, 20); // cut mid-file
        expect(await extractStory(truncatedZip, "zip", "zcode")).toBeNull();
        expect(await extractStory(new Uint8Array([0x1f, 0x8b, 9, 9, 9]), "gzip", "zcode")).toBeNull();
        expect(await extractStory(new Uint8Array(600).fill(7), "tar", "zcode")).toBeNull();
    });
});
