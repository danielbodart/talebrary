import type {R2Bucket, R2Object, R2ObjectBody} from "@cloudflare/workers-types";
import type {TalebraryBucket, PutOptions} from "./TalebraryBucket.ts";

export class CloudflareR2Adapter implements TalebraryBucket {
    constructor(private r2: R2Bucket) {
    }

    async get(key: string, options?: { onlyIf?: { etagDoesNotMatch?: string } }): Promise<Response> {
        const etag = options?.onlyIf?.etagDoesNotMatch;
        const r2Options = etag ? {onlyIf: {etagDoesNotMatch: unquote(etag)}} : undefined;
        const object = await this.r2.get(key, r2Options);
        return toResponse(object);
    }

    async put(key: string, value: ArrayBuffer | Uint8Array | string, options?: PutOptions): Promise<void> {
        await this.r2.put(key, value, {
            httpMetadata: {
                contentType: options?.contentType,
                cacheControl: options?.cacheControl,
            },
            customMetadata: options?.customMetadata,
        });
    }
}

function toResponse(object: R2Object | R2ObjectBody | null): Response {
    if (!object) return new Response('Not Found', {status: 404});
    const headers = new Headers();
    object.writeHttpMetadata(headers as any);
    if (!('body' in object)) return new Response(null, {status: 304, headers});
    const etag = object.httpEtag ?? md5Checksum(object);
    if (etag) headers.set('etag', etag);
    const description = object.customMetadata?.description;
    if (description) headers.set('description', description);
    return new Response(object.body as any, {headers});
}

function md5Checksum(object: R2Object | R2ObjectBody): string | undefined {
    const md5 = object.checksums.toJSON().md5;
    return md5 ? `"${md5}"` : undefined;
}

function unquote(etag: string): string {
    return etag.replaceAll('"', '');
}
