import {type HttpHandler} from "./http/mod.ts";
import type {R2Bucket} from "@cloudflare/workers-types";
import {toResponse} from "./ToResponse.ts";
import {Uri} from "./http/Uri.ts";
import type {Digest} from "./digest.ts";
import type {DependsOn} from "./ApplicationScope.ts";


export function unquote(oldEtag: string) {
    return oldEtag.replace('"', '');
}

export interface R2CachingHandlerDeps extends DependsOn<'r2', R2Bucket>,
    DependsOn<'digest', Digest> {
}

export class R2CachingHandler {
    constructor(private deps: R2CachingHandlerDeps, private http: HttpHandler) {
    }

    async handle(request: Request): Promise<Response> {
        const key = await this.key(request);
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
        const response = await this.http(request);
        if (!response.ok) return response;

        const buffer = await response.arrayBuffer();
        try {
            const result = await this.deps.r2.put(key, buffer, {
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
        return path.substring(1) + (query ? `/${await this.deps.digest(new TextEncoder().encode(query).buffer)}` : '')
    }
}
