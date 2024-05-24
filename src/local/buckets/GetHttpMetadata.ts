import type {R2HTTPMetadata} from "@cloudflare/workers-types";
import {getAttribute} from "./attributes.ts";
import {type BunFile, CryptoHasher} from "bun";

export function getHttpMetadata(file: BunFile): R2HTTPMetadata | undefined {
    if (!file.name) return undefined;
    return {
        contentType: getAttribute(file.name, 'user.content-type'),
        cacheControl: getAttribute(file.name, 'user.cache-control'),
    }
}

export async function getHttpEtag(file: BunFile): Promise<string> {
    const hasher = new CryptoHasher("md5");
    hasher.update(await file.arrayBuffer());
    return hasher.digest('hex');
}