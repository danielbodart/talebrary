import type {Ai} from "@cloudflare/workers-types";

import {Uri} from "../http/Uri.ts";

import type {Dependency} from "../yadic/mod.ts";
import type {StableDiffusion} from "../stability-ai/StableDiffusion.ts";
import {illustrationPrompt} from "../prompts/IllustrationPrompt.ts";
import {generateIllustrationPrompt} from "../prompts/GenerateIllustrationPrompt.ts";
import type {FluxResponse} from "../types.ts";

export interface IllustrationDependencies extends Dependency<'ai', Ai>,
    Dependency<'stableDiffusion', StableDiffusion> {
}

export function _try<R>(fun: () => R | undefined, rejected: (e: unknown | undefined) => R): R {
    try {
        const result = fun();
        if (typeof result == 'undefined') return rejected(undefined);
        return result;
    } catch (e) {
        return rejected(e);
    }
}


async function decodeBase64(value: string) {
    return await (await fetch("data:application/octet;base64," + value)).arrayBuffer();
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

        if (model.startsWith('llama+')) {
            const result = await this.deps.ai.run('@cf/meta/llama-3.2-3b-instruct' as any, generateIllustrationPrompt(data) as any) as any;
            const prompt = _try(() => JSON.parse(result.response), (e) => ({
                status: 500,
                statusText: 'Expected JSON response',
                reason: String(e)
            }));
            if (prompt.status) {
                return new Response(prompt, {status: prompt.status, statusText: prompt.statusText});
            }

            if (model.endsWith('flux')) {
                const result = await this.deps.ai.run('@cf/black-forest-labs/flux-1-schnell' as any, prompt) as any as FluxResponse;
                const image = await decodeBase64(result.image);
                return new Response(image as any, {
                    headers: {
                        'content-type': 'image/jpeg',
                        'description': prompt.prompt,
                        'type': typeof image
                    }
                });
            }

            const image = await this.deps.ai.run('@cf/bytedance/stable-diffusion-xl-lightning', prompt);
            return new Response(image as any, {headers: {'content-type': 'image/jpeg', 'description': prompt.prompt}});
        }

        const prompt = illustrationPrompt(path, data);

        if (model.startsWith('sd3')) {
            const image = await this.deps.stableDiffusion.run({prompt, model, output_format: "jpeg"});
            return new Response(image, {headers: {'content-type': 'image/jpeg'}});
        }

        const response = await this.deps.ai.run(model, {prompt}) as any;
        const image = model.includes('flux') ? await decodeBase64(response.image) : response;
        return new Response(image, {headers: {'content-type': 'image/jpeg'}});
    }
}

