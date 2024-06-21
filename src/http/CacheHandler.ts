import type {Cache, CacheQueryOptions, CfProperties, RequestInfo, Response} from "@cloudflare/workers-types";
import type {HttpHandler} from "./mod.ts";

export function cacheHandler(cache: Cache, http: HttpHandler) {
    return (async (request: Request) => {
        const old = await cache.match(request as any);
        if (old) return old;

        const response = await http(request);
        await cache.put(request as any, response.clone() as any)

        return response;
    }) as HttpHandler;
}

export class NoCache implements Cache {
    async delete(_request: RequestInfo<unknown, CfProperties<unknown>>, _options?: CacheQueryOptions | undefined): Promise<boolean> {
        return true;
    }

    async match(_request: RequestInfo<unknown, CfProperties<unknown>>, _options?: CacheQueryOptions | undefined): Promise<Response | undefined> {
        return;
    }

    async put(_request: RequestInfo<unknown, CfProperties<unknown>>, _response: Response): Promise<void> {
        return;
    }

}
