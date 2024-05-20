import {get, type HttpHandler, Uri} from "./http.ts";
import type {R2Bucket} from "@cloudflare/workers-types";
import {MediaType} from "./MediaType.ts";


export function covertArtHandler(http: HttpHandler, r2: R2Bucket): HttpHandler {
    return async (request) => {
        const {path} = new Uri(request.url);
        const response = await http(request);
        if (!path.endsWith('/cover-art')) {
            return response;
        }

        if (response.status === 404) {
            const [, , id] = path.split('/');

            const response = await http(get(`https://ifdb.org/viewgame?coverart&id=${id}`));
            if (!response.ok) return response;

            const body = response.body;
            if (body) {
                const [one, two] = body.tee();
                try {
                    await r2.put(path, one as any, {
                        httpMetadata: {
                            contentType: response.headers.get('content-type') ?? MediaType.APPLICATION_OCTET_STREAM,
                            cacheControl: 'public, max-age=60'
                        }
                    });
                } catch (e) {
                    console.error(e);
                }
                return new Response(two, {status: 200})
            }
        }

        return response;
    }
}


