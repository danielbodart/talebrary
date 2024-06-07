import type {Ai} from "@cloudflare/workers-types";
import {Uri} from "../http.ts";

export class ArtHandler {
    constructor(private ai: Ai) {
    }

    async handle(request: Request): Promise<Response> {
        const {query} = new Uri(request.url);
        const prompt = new URLSearchParams(query).get('prompt') ?? "cyberpunk cat";

        const response = await this.ai.run(
            "@cf/bytedance/stable-diffusion-xl-lightning",
            {
                prompt,
            }
        );

        return new Response(response, {
            headers: {
                "content-type": "image/png",
            },
        });
    }
}