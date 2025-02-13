import type {MessageBatch} from "@cloudflare/workers-types";
import {application, type Env} from "../Application.ts";
import {client} from "../http/mod.ts";
import {md5} from "../system/digest.ts";
import {CloudflareSender} from "./CloudflareSender.ts";

function app(env: Env) {
    const app = application({http: client, digest: md5, ...env});
    // Route events to a queue instead of using setInterval as that does not seem work in Cloudflare Workers
    return env.events ? app.set('eventSender', _ => new CloudflareSender(env.events)) : app;
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        return app(env).handler(request as any) as any;
    },

    async queue(batch: MessageBatch<object>, env: Env): Promise<any> {
        await app(env).honeycomb.sendBatch(batch.messages.map(m => m.body));
    },
}