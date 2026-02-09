import {application} from "../Application.ts";
import {Uri} from "../http/Uri.ts";
import {md5} from "../system/digest.ts";
import {ifArchiveHttp} from "./IfArchiveHttp.ts";
import {proxyHandler} from "./proxyHandler.ts";
import {CloudflareAiAdapter} from "../ai/CloudflareAiAdapter.ts";
import {CloudflareR2Adapter} from "../storage/CloudflareR2Adapter.ts";
import {D1Adapter} from "../database/D1Adapter.ts";
import {CloudflareWorkflowRunner} from "./CloudflareWorkflowRunner.ts";
import {coverArtWorkflow} from "../workflows/coverArt.ts";
// @ts-ignore
import {WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep} from "cloudflare:workers";
import type {CoverArtParams} from "../workflows/coverArt.ts";

export {IfArchiveProxy} from "./IfArchiveProxy.ts";

function app(env: Env) {
    return application({
        http: ifArchiveHttp(env.IFARCHIVE_PROXY),
        digest: md5,
        db: new D1Adapter(env.db),
        bucket: new CloudflareR2Adapter(env.r2),
        ai: new CloudflareAiAdapter(env.ai),
        coverArtRunner: new CloudflareWorkflowRunner(env.WORKFLOW),
    });
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

export class CoverArtWorkflow extends WorkflowEntrypoint<Env, CoverArtParams> {
    declare env: Env;

    async run(event: WorkflowEvent<CoverArtParams>, step: WorkflowStep) {
        const deps = app(this.env);
        return coverArtWorkflow(deps)(event.payload, step);
    }
}
