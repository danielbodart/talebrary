import type {Ai} from "@cloudflare/workers-types";

import {Uri} from "../http/Uri.ts";

export class ArtHandler {
    constructor(private ai: Ai) {
    }

    async handle(request: Request): Promise<Response> {
        const {query} = new Uri(request.url);
        const params = new URLSearchParams(query);

        const rawPrompt = params.get('prompt');
        if (!rawPrompt) return new Response('Not Found', {status: 404});

        const model = params.get('model') ?? "@cf/bytedance/stable-diffusion-xl-lightning" as any;
        const data = JSON.parse(rawPrompt);
        const prompt = `
                    Create an illustration for a scene called "${data.scene.title}" and described  
                    "${data.scene.description.replace('"', '`')}"
                    The scene is part of the interactive fiction called "${data.story.title}" 
                    "${data.story.author ? `by "${data.story.author}".` : ''}
                    "${data.story.description ? `and described as "${data.story.description}".` : ''}
                    ${data.previous ? `The scene should be consistent with the previous scene, which was called "${data.previous.title}" 
                    and described as "${data.previous.description.replace('"', '`')}"` : ''
        }`.replace(/\s+/g, ' ');

        const response = await this.ai.run(model, {prompt});

        return new Response(response, {
            headers: {
                "content-type": "image/png",
            },
        });
    }
}