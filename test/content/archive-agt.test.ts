import {describe, expect, test} from "bun:test";
import {readFileSync, readdirSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {join} from "node:path";
import {zipSync} from "fflate";
import {agtToAgx} from "@bodar/wasiglk";
import {extractStory} from "../../src/content/archive.ts";

// Load agt2agx the same way the Bun composition root does — via the package,
// no node_modules path. The Cloudflare root bundles it instead; both feed the
// same converter into extractStory.
const agtWasm = new URL("../wasm/agt2agx.wasm", import.meta.resolve("@bodar/wasiglk"));
const agtModule = new WebAssembly.Module(readFileSync(fileURLToPath(agtWasm)));
const convertAgt = (files: Record<string, Uint8Array>) => agtToAgx(agtModule, files);

// Real multi-file AGT game (Crusade, David Malmberg, 1987 IF Archive freeware).
function crusadeZip(): Uint8Array {
    const dir = join(import.meta.dir, "../fixtures/agt");
    const entries: Record<string, Uint8Array> = {};
    for (const name of readdirSync(dir)) entries[name] = new Uint8Array(readFileSync(join(dir, name)));
    return zipSync(entries);
}

describe("extractStory (AGT)", () => {
    test("converts a classic multi-file AGT archive into a single AGX", async () => {
        const out = await extractStory(crusadeZip(), "zip", "agt", "CRUSADE.D$$", convertAgt);
        expect(out).not.toBeNull();
        const magic = Array.from(new Uint8Array(out!).slice(0, 4));
        expect(magic).toEqual([0x58, 0xc7, 0xc1, 0x51]); // AGX signature
    });

    test("returns null for an AGT archive when no converter is injected", async () => {
        const out = await extractStory(crusadeZip(), "zip", "agt", "CRUSADE.D$$");
        expect(out).toBeNull();
    });
});
