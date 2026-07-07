import {application} from "../Application.ts";
import {Uri} from "../http/Uri.ts";
import {md5} from "../system/digest.ts";
import {ifArchiveHttp} from "./IfArchiveHttp.ts";
import {proxyHandler} from "./proxyHandler.ts";
import {CloudflareAiAdapter} from "../ai/CloudflareAiAdapter.ts";
import {CloudflareR2Adapter} from "../storage/CloudflareR2Adapter.ts";
import {D1Adapter} from "../database/D1Adapter.ts";
import {BetterAuthAdapter} from "../auth/BetterAuthAdapter.ts";
import {CloudflareWorkflowRunner} from "./CloudflareWorkflowRunner.ts";
import {CloudflarePipelineAdapter} from "../events/CloudflarePipelineAdapter.ts";
import {coverArtWorkflow} from "../workflows/coverArt.ts";
import {illustrationWorkflow} from "../workflows/illustration.ts";
// @ts-ignore
import {WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep} from "cloudflare:workers";
import type {CoverArtParams, CoverArtResult} from "../workflows/coverArt.ts";
import type {IllustrationParams, IllustrationResult} from "../workflows/illustration.ts";

export {IfArchiveProxy} from "./IfArchiveProxy.ts";

function deps(env: Env) {
    return {
        http: ifArchiveHttp(env.IFARCHIVE_PROXY),
        digest: md5,
        db: new D1Adapter(env.db),
        bucket: new CloudflareR2Adapter(env.r2),
        ai: new CloudflareAiAdapter(env.ai, "default"),
        eventSender: new CloudflarePipelineAdapter(env.TRANSCRIPTS),
        auth: new BetterAuthAdapter(env.db, {
            secret: env.BETTER_AUTH_SECRET,
            baseURL: env.BETTER_AUTH_URL,
            googleClientId: env.GOOGLE_CLIENT_ID,
            googleClientSecret: env.GOOGLE_CLIENT_SECRET,
            dashApiKey: env.BETTER_AUTH_API_KEY,
        }),
        coverArtRunner: new CloudflareWorkflowRunner<CoverArtParams, CoverArtResult>(env.COVER_ART_WORKFLOW),
        illustrationRunner: new CloudflareWorkflowRunner<IllustrationParams, IllustrationResult>(env.ILLUSTRATION_WORKFLOW),
    };
}

function app(env: Env) {
    return application(deps(env));
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
        return coverArtWorkflow(deps(this.env))(event.payload, step);
    }
}

export class IllustrationWorkflow extends WorkflowEntrypoint<Env, IllustrationParams> {
    declare env: Env;

    async run(event: WorkflowEvent<IllustrationParams>, step: WorkflowStep) {
        return illustrationWorkflow(deps(this.env))(event.payload, step);
    }
}
