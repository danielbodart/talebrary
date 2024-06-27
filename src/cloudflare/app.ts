import {application, type Env} from "../Application.ts";
import {client} from "../http/mod.ts";
import {md5} from "../system/digest.ts";

function app(env: Env) {
    // @ts-ignore
    const app = application(client, env.db, env.r2, md5, env.ai, env);
    app.set('eventSender', deps => deps.honeycomb)
    return app;
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        return app(env).handler(request as any) as any;
    },
};