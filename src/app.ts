import {applicationScope, type Env} from "./ApplicationScope.ts";
import {client} from "./http/mod.ts";
import {md5} from "./digest.ts";

function app(env: Env) {
    // @ts-ignore
    return applicationScope(client, env.db, env.r2, md5, env.ai, env);
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        return app(env).handler(request as any) as any;
    },
};