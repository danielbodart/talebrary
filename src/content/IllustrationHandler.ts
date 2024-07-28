import type {Ai} from "@cloudflare/workers-types";

import {Uri} from "../http/Uri.ts";
import {illustrationPrompt} from "./Prompts.ts";

import type {Dependency} from "../yadic/mod.ts";
import type {StableDiffusion} from "../stability-ai/StableDiffusion.ts";

export interface IllustrationDependencies extends Dependency<'ai', Ai>,
    Dependency<'stableDiffusion', StableDiffusion> {
}

export class IllustrationHandler {
    constructor(private deps: IllustrationDependencies) {
    }

    async handle(request: Request): Promise<Response> {
        const {path, query} = new Uri(request.url);
        const params = new URLSearchParams(query);

        const model = params.get('model') ?? "@cf/bytedance/stable-diffusion-xl-lightning" as any;

        const rawPrompt = params.get('prompt');
        if (!rawPrompt) return new Response('Not Found', {status: 404});

        const data = JSON.parse(rawPrompt);
        const prompt = illustrationPrompt(path, data);

        if (model.startsWith('sd3')) {
            const image = await this.deps.stableDiffusion.run({prompt, model, output_format: "jpeg"});
            return new Response(image, {headers: {'content-type': 'image/jpeg'}});
        }
        const image = await this.deps.ai.run(model, {prompt});
        return new Response(image);
    }
}

