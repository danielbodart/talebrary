import type {R2ObjectBody} from "@cloudflare/workers-types";

export function toResponse(object: R2ObjectBody | null): Response {
    if (!object) return new Response('Not Found', {status: 404});
    const headers = new Headers();
    object.writeHttpMetadata(headers as any);
    const etag = object.httpEtag;
    if (etag) headers.set('etag', etag);
    return new Response(object.body as any, {headers});
}