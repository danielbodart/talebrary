import {Uri} from "../http/Uri.ts";
import type {Dependency} from "@bodar/yadic/types.ts";
import {illustrationPrompt} from "../prompts/IllustrationPrompt.ts";
import {generateIllustrationPrompt} from "../prompts/GenerateIllustrationPrompt.ts";
import type {TalebraryAi} from "../ai/TalebraryAi.ts";

export interface IllustrationDependencies extends
    Dependency<'ai', TalebraryAi> {
}

interface PromptResult {
    prompt?: string;
    status?: number;
    statusText?: string;
    reason?: string;
}

function errorResponse(status: number, statusText: string, reason: string): Response {
    return new Response(JSON.stringify({status, statusText, reason}), {status, statusText, headers: {'content-type': 'application/json'}});
}

export class IllustrationHandler {
    constructor(private deps: IllustrationDependencies) {
    }

    async handle(request: Request): Promise<Response> {
        const {path, query} = new Uri(request.url);
        const params = new URLSearchParams(query);

        const model = params.get('model') ?? 'llama+stable-diffusion';

        const rawPrompt = params.get('prompt');
        if (!rawPrompt) return new Response('Not Found', {status: 404});

        let data: any;
        try {
            data = JSON.parse(rawPrompt);
        } catch (e) {
            return errorResponse(400, 'Invalid JSON', String(e));
        }

        if (model.startsWith('llama+')) {
            const imageModel = model.endsWith('flux')
                ? '@cf/black-forest-labs/flux-1-schnell'
                : '@cf/bytedance/stable-diffusion-xl-lightning';

            let result: PromptResult;
            try {
                result = await this.deps.ai.generateText<PromptResult>('@cf/meta/llama-3.3-70b-instruct-fp8-fast', generateIllustrationPrompt(data));
            } catch (e) {
                result = {status: 500, statusText: 'Expected JSON response', reason: String(e)};
            }
            if (result.status) {
                return new Response(JSON.stringify(result), {status: result.status, statusText: result.statusText});
            }

            let image: Uint8Array;
            try {
                image = await this.deps.ai.generateImage(imageModel, {prompt: result.prompt!});
            } catch (e) {
                return errorResponse(500, 'Image generation failed', String(e));
            }
            return new Response(image as any, {headers: {'content-type': 'image/jpeg', 'description': result.prompt!}});
        }

        const promptText = illustrationPrompt(path, data);
        let image: Uint8Array;
        try {
            image = await this.deps.ai.generateImage(model, {prompt: promptText});
        } catch (e) {
            return errorResponse(500, 'Image generation failed', String(e));
        }
        return new Response(image as any, {headers: {'content-type': 'image/jpeg'}});
    }
}
