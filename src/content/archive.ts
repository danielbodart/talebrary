import {unzipSync} from "fflate";
import {detectFormatFromUrl, detectFormatFromData} from "@bodar/wasiglk";
import type {SupportedGameType} from "../types.ts";

// Some IFDB story links point at a compressed archive rather than a bare story
// file. We fetch the archive, pull out the story file matching the game's format
// and serve that (BucketCachingHandler then caches the extracted bytes). The
// player is unaffected — it receives a plain story plus the correct data-type.

export type ArchiveKind = 'zip' | 'gzip' | 'tar';

// Caps to stay within the Workers memory limit on untrusted archives. IF stories
// are small (KB–low MB); anything larger is not a single-story archive. The
// decompressed cap guards against zip/gzip bombs (a tiny archive that declares a
// huge uncompressed size).
export const MAX_ARCHIVE_BYTES = 40 * 1024 * 1024;
const MAX_DECOMPRESSED_BYTES = 64 * 1024 * 1024;
// Below this a member can't be a real story, so we don't trust loose magic bytes.
const MIN_STORY_BYTES = 512;

interface Entry {
    name: string;
    bytes: Uint8Array;
}

export function detectArchive(bytes: Uint8Array): ArchiveKind | null {
    if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) return 'zip';
    if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) return 'gzip';
    if (isTar(bytes)) return 'tar';
    return null;
}

// tar has "ustar" at byte offset 257 of the first 512-byte header block.
function isTar(bytes: Uint8Array): boolean {
    if (bytes.length < 512) return false;
    return String.fromCharCode(bytes[257], bytes[258], bytes[259], bytes[260], bytes[261]) === 'ustar';
}

// IFDB format ("blorb/zcode") -> wasiglk StoryFormat ("zcode").
function normalizeFormat(type: SupportedGameType): string {
    return type.replace(/^blorb\//, '');
}

// A fresh, exactly-sized ArrayBuffer for the given view (safe as a Response body).
function bufferOf(view: Uint8Array): ArrayBuffer {
    return view.slice().buffer;
}

// Gunzip while counting output, aborting past the cap (defends against bombs).
async function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
    const reader = new Response(bufferOf(bytes)).body!.pipeThrough(new DecompressionStream('gzip')).getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (; ;) {
        const {done, value} = await reader.read();
        if (done) break;
        total += value.length;
        if (total > MAX_DECOMPRESSED_BYTES) {
            await reader.cancel();
            throw new Error('decompressed size exceeds cap');
        }
        chunks.push(value);
    }
    const out = new Uint8Array(total);
    let o = 0;
    for (const c of chunks) { out.set(c, o); o += c.length; }
    return out;
}

// Unzip only members within the size cap; oversized entries are skipped by the
// filter so fflate never allocates for them (zip-bomb defence). Synchronous —
// fflate's async unzip spawns web workers, which are unavailable/unreliable in
// Workers and Bun.
function unzipCapped(bytes: Uint8Array): Record<string, Uint8Array> {
    return unzipSync(bytes, {filter: f => f.originalSize <= MAX_DECOMPRESSED_BYTES});
}

// Minimal tar reader: iterate 512-byte headers, collecting regular files.
function readTar(bytes: Uint8Array): Entry[] {
    const entries: Entry[] = [];
    let off = 0;
    while (off + 512 <= bytes.length) {
        const header = bytes.subarray(off, off + 512);
        let name = '';
        for (let i = 0; i < 100 && header[i] !== 0; i++) name += String.fromCharCode(header[i]);
        if (name === '') break; // end-of-archive marker (zero block)
        let sizeStr = '';
        for (let i = 124; i < 136 && header[i] !== 0 && header[i] !== 0x20; i++) sizeStr += String.fromCharCode(header[i]);
        const size = parseInt(sizeStr.trim() || '0', 8);
        const typeflag = header[156];
        off += 512;
        if (typeflag === 0 || typeflag === 0x30) { // NUL or '0' = regular file
            entries.push({name, bytes: bytes.subarray(off, off + size)});
        }
        off += Math.ceil(size / 512) * 512;
    }
    return entries;
}

// Locate the member IFDB names as this game's story inside the archive. Matches
// exact, then case-insensitively, then by basename (archives may nest in a dir).
function pickByName(entries: Entry[], primary: string): Uint8Array | null {
    const lc = primary.toLowerCase();
    const base = lc.split('/').pop();
    return (entries.find(e => e.name === primary)
        ?? entries.find(e => e.name.toLowerCase() === lc)
        ?? entries.find(e => e.name.toLowerCase().split('/').pop() === base))?.bytes ?? null;
}

// Choose the story file: if IFDB names it (primary), use that member; otherwise
// prefer a member whose detected format matches the game's IFDB format, else the
// largest member with a story extension, else magic-byte detection. Largest wins
// ties (feelies and readmes are small; the story is the payload).
function pickStory(entries: Entry[], type: SupportedGameType, primary?: string | null): Uint8Array | null {
    if (primary) {
        const named = pickByName(entries, primary);
        if (named) return named;
    }
    const want = normalizeFormat(type);
    const byExt = entries
        .map(e => ({e, info: detectFormatFromUrl(e.name)}))
        .filter((c): c is {e: Entry; info: NonNullable<typeof c.info>} => c.info !== null);
    if (byExt.length) {
        const matched = byExt.filter(c => c.info.format === want);
        const pool = matched.length ? matched : byExt;
        pool.sort((a, b) => b.e.bytes.length - a.e.bytes.length);
        return pool[0].e.bytes;
    }
    // Magic-byte detection is loose (any leading 0x01–0x08 reads as z-code), so
    // only trust it for members large enough to be a real story, not stray files.
    const byMagic = entries
        .filter(e => e.bytes.length >= MIN_STORY_BYTES && detectFormatFromData(e.bytes) !== null)
        .sort((a, b) => b.bytes.length - a.bytes.length);
    return byMagic.length ? byMagic[0].bytes : null;
}

// Returns the story bytes, or null if the archive is oversized, malformed, or
// contains no recognisable story (callers return 404 so nothing bad is cached).
export async function extractStory(bytes: Uint8Array, kind: ArchiveKind, type: SupportedGameType, primary?: string | null): Promise<ArrayBuffer | null> {
    if (bytes.length > MAX_ARCHIVE_BYTES) return null;
    try {
        let entries: Entry[];
        if (kind === 'zip') {
            entries = Object.entries(unzipCapped(bytes)).map(([name, b]) => ({name, bytes: b}));
        } else if (kind === 'gzip') {
            const inner = await gunzip(bytes);
            if (!isTar(inner)) return bufferOf(inner); // plain gzip is single-stream: the story itself
            entries = readTar(inner);                   // .tar.gz / .tgz
        } else {
            entries = readTar(bytes);
        }
        const story = pickStory(entries, type, primary);
        return story ? bufferOf(story) : null;
    } catch {
        return null; // malformed/truncated archive
    }
}
