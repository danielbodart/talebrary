import {get, type HttpHandler} from "./http/mod.ts";
import type {R2Bucket} from "@cloudflare/workers-types";
import {toResponse} from "./ToResponse.ts";
import type {D1GameFinder} from "./D1GameFinder.ts";
import {Uri} from "./http/Uri.ts";
import type {Digest} from "./digest.ts";


export function unquote(oldEtag: string) {
    return oldEtag.replace('"', '');
}

export function coverArt(http: HttpHandler): HttpHandler {
    return async request => {
        const uri = new Uri(request.url);
        const [, , id] = uri.path.split('/');
        return http(get(`https://ifdb.org/viewgame?coverart&id=${id}`));
    }
}

export function story(http: HttpHandler, d1: D1GameFinder): HttpHandler {
    return async request => {
        const uri = new Uri(request.url);
        const [, , id] = uri.path.split('/');
        const game = await d1.get(id);
        return game ? http(get(game.url)) : new Response('Not Found', {status: 404});
    }
}

export class R2CachingHandler {
    constructor(private r2: R2Bucket, private digest: Digest, private http: HttpHandler) {
    }

    async handle(request: Request): Promise<Response> {
        const key = await this.key(request);
        try {
            const oldEtag = request.headers.get('if-none-match');
            const response = toResponse(await this.r2.get(key, oldEtag ? {onlyIf: {etagDoesNotMatch: unquote(oldEtag)}} : undefined));
            if (response.status !== 404) {
                console.log('Found in R2', key, response.status);
                return response;
            }
        } catch (e) {
            console.error(e);
        }

        console.log('Not found in R2', key);
        const response = await this.http(request);
        if (!response.ok) return response;

        const buffer = await response.arrayBuffer();
        try {
            const result = await this.r2.put(key, buffer, {
                httpMetadata: {
                    contentType: response.headers.get('content-type') ?? "application/octet-stream",
                    cacheControl: 'public, max-age=60'
                }
            });
            console.log("Uploaded to R2", result.key, result.version);
        } catch (e) {
            console.error("Error uploading to R2", e);
        }
        return new Response(buffer, {status: 200})
    }

    private async key(request: Request) {
        const {path, query} = new Uri(request.url);
        return path.substring(1) + (query ? `/${await this.digest(new TextEncoder().encode(query).buffer)}` : '')
    }
}
