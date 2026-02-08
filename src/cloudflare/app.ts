import {application} from "../Application.ts";
import {Uri} from "../http/Uri.ts";
import {md5} from "../system/digest.ts";
import {ifArchiveHttp} from "./IfArchiveHttp.ts";
import {proxyHandler} from "./proxyHandler.ts";
import {CloudflareAiAdapter} from "../ai/CloudflareAiAdapter.ts";

export {IfArchiveProxy} from "./IfArchiveProxy.ts";

function app(env: Env) {
    return application({http: ifArchiveHttp(env.IFARCHIVE_PROXY), digest: md5, db: env.db, r2: env.r2, ai: new CloudflareAiAdapter(env.ai)});
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const {path} = new Uri(request.url);
        if (path === '/proxy') {
            if (!env.PROXY_TOKEN) return new Response('Not found', {status: 404}) as any;
            return proxyHandler(request, env.PROXY_TOKEN, ifArchiveHttp(env.IFARCHIVE_PROXY)) as any;
        }
        return app(env).handler(request as any) as any;
    },
}
