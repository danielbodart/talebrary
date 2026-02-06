import {application} from "../Application.ts";
import {client} from "../http/mod.ts";
import {md5} from "../system/digest.ts";

function app(env: Env) {
    return application({http: client, digest: md5, ...env});
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        return app(env).handler(request as any) as any;
    },
}
