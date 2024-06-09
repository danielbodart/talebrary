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
        const prompt = ` Create an illustration for the scene "${data.scene.title}" and is described as follows: 
                    ${data.story.description}`;

        const response = await this.ai.run(model, {prompt});

        return new Response(response, {
            headers: {
                "content-type": "image/png",
            },
        });
    }
}