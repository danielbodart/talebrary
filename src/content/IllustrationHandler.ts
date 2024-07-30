import type {Ai} from "@cloudflare/workers-types";

import {Uri} from "../http/Uri.ts";

import type {Dependency} from "../yadic/mod.ts";
import type {StableDiffusion} from "../stability-ai/StableDiffusion.ts";
import {illustrationPrompt} from "../prompts/IllustrationPrompt.ts";
import {generateIllustrationPrompt} from "../prompts/GenerateIllustrationPrompt.ts";

export interface IllustrationDependencies extends Dependency<'ai', Ai>,
    Dependency<'stableDiffusion', StableDiffusion> {
}

export function _try<R>(fun: () => R | undefined, defaultResult: any = undefined): R {
    try {
        const result = fun();
        if (typeof result == 'undefined') return defaultResult;
        return result;
    } catch (e) {
        return defaultResult;
    }
}


export class IllustrationHandler {
    constructor(private deps: IllustrationDependencies) {
    }

    async handle(request: Request): Promise<Response> {
        const {path, query} = new Uri(request.url);
        const params = new URLSearchParams(query);

        const model = params.get('model') ?? 'llama+stable-diffusion' as any;

        const rawPrompt = params.get('prompt');
        if (!rawPrompt) return new Response('Not Found', {status: 404});

        const data = JSON.parse(rawPrompt);

        if (model === 'llama+stable-diffusion') {
            const result = await this.deps.ai.run('@cf/meta/llama-3.1-8b-instruct' as any, generateIllustrationPrompt(data)) as any;
            const prompt = _try(() => JSON.parse(result.response), {status: 500, statusText: 'Expected JSON response'});
            if (prompt.status) {
                return new Response(prompt, {status: prompt.status, statusText: prompt.statusText});
            }

            const image = await this.deps.ai.run('@cf/bytedance/stable-diffusion-xl-lightning', prompt);
            return new Response(image as any, {headers: {'content-type': 'image/jpeg', 'description': prompt.prompt}});
        }

        const prompt = illustrationPrompt(path, data);

        if (model.startsWith('sd3')) {
            const image = await this.deps.stableDiffusion.run({prompt, model, output_format: "jpeg"});
            return new Response(image, {headers: {'content-type': 'image/jpeg'}});
        }

        const image = await this.deps.ai.run(model, {prompt});
        return new Response(image, {headers: {'content-type': 'image/jpeg'}});
    }
}

