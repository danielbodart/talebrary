import {application} from "../Application.ts";
import {md5} from "../system/digest.ts";
import {ifArchiveHttp} from "./IfArchiveHttp.ts";

export {IfArchiveProxy} from "./IfArchiveProxy.ts";

function app(env: Env) {
    return application({http: ifArchiveHttp(env.IFARCHIVE_PROXY), digest: md5, ...env});
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        return app(env).handler(request as any) as any;
    },
}
