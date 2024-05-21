import {get, type HttpHandler, Uri} from "./http.ts";
import type {R2Bucket} from "@cloudflare/workers-types";
import {MediaType} from "./MediaType.ts";


export function covertArtHandler(http: HttpHandler, r2: R2Bucket): HttpHandler {
    return async (request) => {
        const uri = new Uri(request.url);
        const {path} = uri;
        if (path.endsWith('/cover-art')) {
            // Encode slashes as that is what R2 expects!
            uri.path = `/${encodeURIComponent(uri.path)}`;
            const newUri = uri.toString();
            console.log('newUri', newUri);
            const response = await http(new Request(newUri, request));
            if (response.status === 404) {
                console.log('404', newUri);
                const [, , id] = path.split('/');

                const response = await http(get(`https://ifdb.org/viewgame?coverart&id=${id}`));
                if (!response.ok) return response;

                const body = response.body;
                if (body) {
                    const [one, two] = body.tee();
                    try {
                        // Drop slash as R2 does not correctly handle paths
                        const result = await r2.put(path.substring(1), one as any, {
                            httpMetadata: {
                                contentType: response.headers.get('content-type') ?? MediaType.APPLICATION_OCTET_STREAM,
                                cacheControl: 'public, max-age=60'
                            }
                        });
                        console.log(result);
                    } catch (e) {
                        console.error(e);
                    }
                    return new Response(two, {status: 200})
                }
            }
        }

        return http(request);
    }
}


