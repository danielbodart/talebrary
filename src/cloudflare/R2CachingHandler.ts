import {type Http} from "../http/mod.ts";
import type {R2Bucket} from "@cloudflare/workers-types";
import {toResponse} from "./ToResponse.ts";
import type {Digest} from "../system/digest.ts";

import type {Dependency} from "@bodar/yadic/types.ts";
import {detectMimeType} from "../http/DetectMimeType.ts";


export function unquote(oldEtag: string) {
    return oldEtag.replace('"', '');
}

export interface R2CachingHandlerDeps extends Dependency<'r2', R2Bucket>,
    Dependency<'digest', Digest> {
}

export class R2CachingHandler {
    constructor(private deps: R2CachingHandlerDeps, private http: Http) {
    }

    async handle(request: Request): Promise<Response> {
        const {pathname: path, searchParams} = new URL(request.url);
        const reload = searchParams.has('reload');
        if (reload) searchParams.delete('reload');
        const query = searchParams.toString();
        const key = path.substring(1) + (query ? `/${await this.deps.digest(new TextEncoder().encode(query).buffer)}` : '')

        if (reload) {
            console.log('Force reload', key);
        } else {
            try {
                const oldEtag = request.headers.get('if-none-match');
                const response = toResponse(await this.deps.r2.get(key, oldEtag ? {onlyIf: {etagDoesNotMatch: unquote(oldEtag)}} : undefined));
                if (response.status !== 404) {
                    console.log('Found in R2', key, response.status);
                    return response;
                }
            } catch (e) {
                console.error(e);
            }

            console.log('Not found in R2', key);
        }

        const response = await this.http(request);
        if (!response.ok) return response;

        const buffer = await response.arrayBuffer();
        try {
            const result = await this.deps.r2.put(key, buffer, {
                httpMetadata: {
                    contentType: response.headers.get('content-type') ?? (await detectMimeType(new Uint8Array(buffer))),
                    cacheControl: 'public, max-age=60'
                },
                customMetadata: {
                    description: response.headers.get('description') ?? ''
                }
            });
            console.log("Uploaded to R2", result.key, result.version);
        } catch (e) {
            console.error("Error uploading to R2", e);
        }
        return new Response(buffer, {status: 200, headers: response.headers});
    }
}
