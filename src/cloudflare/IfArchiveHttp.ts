import {type Http} from "../http/mod.ts";
import type {DurableObjectNamespace} from "@cloudflare/workers-types";

export function ifArchiveHttp(doNamespace: DurableObjectNamespace): Http {
    const id = doNamespace.idFromName("proxy");
    const stub = doNamespace.get(id, {locationHint: "enam"});

    return async (request: Request): Promise<Response> => {
        const url = new URL(request.url);
        if (url.hostname.endsWith('ifarchive.org')) {
            return stub.fetch(
                new Request(`https://proxy/?url=${encodeURIComponent(request.url)}`) as any
            ) as any;
        }
        return fetch(request);
    };
}
