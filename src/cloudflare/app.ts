import {application, type Env} from "../Application.ts";
import {crossOriginIsolation} from "../http/CrossOriginIsolation.ts";
import {client} from "../http/mod.ts";
import {md5} from "../system/digest.ts";

function app(env: Env) {
    return application({http: client, digest: md5, ...env});
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const handler = crossOriginIsolation(req => app(env).handler(req as any) as any);
        return handler(request);
    },
}
