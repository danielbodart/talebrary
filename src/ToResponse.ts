import type {R2Object, R2ObjectBody} from "@cloudflare/workers-types";

function md5Checksum(object: R2Object | R2ObjectBody): string | undefined {
    const md5 = object.checksums.toJSON().md5;
    return md5 ? `"${md5}"` : undefined;
}

function getEtag(object: R2Object | R2ObjectBody) {
    return object.httpEtag ?? md5Checksum(object);
}

export function toResponse(object: R2Object | R2ObjectBody | null): Response {
    if (!object) return new Response('Not Found', {status: 404});
    const headers = new Headers();
    object.writeHttpMetadata(headers as any);
    console.log('R2 Headers', JSON.stringify(headers.toJSON()));
    if (!('body' in object)) return new Response(null, {status: 304, headers})
    const etag = getEtag(object);
    if (etag) headers.set('etag', etag);
    return new Response(object.body as any, {headers});
}