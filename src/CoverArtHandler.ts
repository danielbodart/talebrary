import {get, type HttpHandler, Uri} from "./http.ts";
import type {R2Bucket} from "@cloudflare/workers-types";
import {toResponse} from "./ToResponse.ts";


function unquote(oldEtag: string) {
    return oldEtag.replace('"', '');
}

export class CoverArtHandler {
    constructor(private http: HttpHandler, private r2: R2Bucket) {
    }

    async handler(request: Request): Promise<Response> {
        const uri = new Uri(request.url);
        const {path} = uri;
        // Drop leading slash as R2 does not correctly handle them
        const key = path.substring(1);
        try {
            const oldEtag = request.headers.get('if-none-match');
            const response = toResponse(await this.r2.get(key, oldEtag ?{onlyIf: {etagMatches: unquote(oldEtag)}} : undefined));
            if (response.status !== 404) {
                console.log('Found in R2', key, response.status);
                return response;
            }
        } catch (e) {
            console.error(e);
        }

        console.log('Not found in R2', key);
        const [, , id] = path.split('/');

        const response = await this.http(get(`https://ifdb.org/viewgame?coverart&id=${id}`));
        if (!response.ok) return response;
        console.log('Found in ifdb', id);

        const body = response.body;
        if (!body) return new Response('Not Found', {status: 404});

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
}
