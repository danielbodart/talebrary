import type {Ai} from "@cloudflare/workers-types";

import {Uri} from "../http/Uri.ts";
import {type Describable, type SceneContext} from "../types.ts";
import {generatePrompt} from "./Prompts.ts";

export class IllustrationHandler {
    constructor(private ai: Ai) {
    }

    async handle(request: Request): Promise<Response> {
        const {query} = new Uri(request.url);
        const params = new URLSearchParams(query);

        const model = params.get('model') ?? "@cf/bytedance/stable-diffusion-xl-lightning" as any;

        const rawPrompt = params.get('prompt');
        if (!rawPrompt) return new Response('Not Found', {status: 404});

        const data: Describable | SceneContext = JSON.parse(rawPrompt);
        const prompt = generatePrompt(data).replace(/\s+/g, ' ');

        const response = await this.ai.run(model, {prompt});

        return new Response(response, {
            headers: {
                "content-type": "image/png",
            },
        });
    }
}

