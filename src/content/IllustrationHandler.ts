import {Uri} from "../http/Uri.ts";
import type {TalebraryBucket} from "../storage/TalebraryBucket.ts";
import type {Dependency} from "@bodar/yadic/types.ts";
import type {WorkflowRunner} from "../workflows/mod.ts";
import type {IllustrationParams, IllustrationResult} from "../workflows/illustration.ts";

export interface IllustrationDependencies extends
    Dependency<'illustrationRunner', WorkflowRunner<IllustrationParams, IllustrationResult>>,
    Dependency<'bucket', TalebraryBucket> {
}

export class IllustrationHandler {
    constructor(private deps: IllustrationDependencies) {
    }

    async handle(request: Request): Promise<Response> {
        const {path, query} = new Uri(request.url);
        const params = new URLSearchParams(query);

        const rawPrompt = params.get('prompt');
        if (!rawPrompt) return new Response('Not Found', {status: 404});

        let data: any;
        try {
            data = JSON.parse(rawPrompt);
        } catch (e) {
            return new Response(JSON.stringify({status: 400, statusText: 'Invalid JSON', reason: String(e)}),
                {status: 400, statusText: 'Invalid JSON', headers: {'content-type': 'application/json'}});
        }

        try {
            const result = await this.deps.illustrationRunner.run({
                data,
                imageModel: params.get('model') ?? undefined,
                path,
            });
            const image = await this.deps.bucket.get(result.bucketKey);
            if (!image.ok) return new Response('Image not found', {status: 500});
            return new Response(image.body, {
                headers: {
                    'content-type': result.contentType,
                    ...(result.description ? {'description': result.description} : {}),
                },
            });
        } catch (e) {
            return new Response(JSON.stringify({status: 500, statusText: 'Workflow failed', reason: String(e)}),
                {status: 500, statusText: 'Workflow failed', headers: {'content-type': 'application/json'}});
        }
    }
}
