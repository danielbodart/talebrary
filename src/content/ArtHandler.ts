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
                    Create an illustration for the interactive fiction story "${data.story.title}" 
                    "${data.story.author ? `by "${data.story.author}".` : ''}  
                    The scene is titled "${data.scene.title}" and is described as follows 
                    "${data.scene.description.replace('"', '`')}"
                    ${data.previous ? `The scene should be consistent with the previous scene as you have just which was titled "${data.previous.title}" 
                    and was described as follows "${data.previous.description.replace('"', '`')}"` : ''
        }`.replace(/\s+/g, ' ');

        const response = await this.ai.run(model, {prompt});

        return new Response(response, {
            headers: {
                "content-type": "image/png",
            },
        });
    }
}