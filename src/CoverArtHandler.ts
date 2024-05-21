import {get, type HttpHandler, Uri} from "./http.ts";
import type {R2Bucket} from "@cloudflare/workers-types";
import {MediaType} from "./MediaType.ts";


export class CoverArtHandler {
    constructor(private http: HttpHandler, private r2: R2Bucket) {
    }

    async handler(request: Request): Promise<Response> {
        const uri = new Uri(request.url);
        const {path} = uri;
        // Drop leading slash as R2 does not correctly handle them
        const key = path.substring(1);
        const object = await this.r2.get(key);

        if (object !== null) {
            const headers = new Headers();
            object.writeHttpMetadata(headers as any);
            headers.set('etag', object.httpEtag);
            return new Response(object.body as any, {headers});
        }

        console.log('Not found in R2', key);
        const [, , id] = path.split('/');

        const response = await this.http(get(`https://ifdb.org/viewgame?coverart&id=${id}`));
        if (!response.ok) return response;
        console.log('Found in ifdb', id);

        const body = response.body;
        if (!body) return new Response('Not Found', {status: 404});

        const [one, two] = body.tee();
        try {
            const result = await this.r2.put(key, one as any, {
                httpMetadata: {
                    contentType: response.headers.get('content-type') ?? MediaType.APPLICATION_OCTET_STREAM,
                    cacheControl: 'public, max-age=60'
                }
            });
            console.log("Uploaded to R2", result.key, result.version);
        } catch (e) {
            console.error("Error uploading to R2", e);
        }
        return new Response(two, {status: 200})
    }
}


