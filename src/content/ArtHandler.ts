import type {Ai} from "@cloudflare/workers-types";
import {Uri} from "../http.ts";

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
                    You are an illustrator for the interactive fiction story called ${data.story.title} by ${data.story.author}, ${data.story.description ? `which is described as ${data.story.description}` : ''}.
                    You need to create an image for the current scene who's title is ${data.scene.title} and described as ${data.scene.description}.
                    The image should have a strong connection with the scene title.
                    
                    `.replace(/\s+/g, ' ');

        const response = await this.ai.run(model, {prompt});

        return new Response(response, {
            headers: {
                "content-type": "image/png",
            },
        });
    }
}