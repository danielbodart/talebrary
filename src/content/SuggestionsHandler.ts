import type {Ai, AiTextGenerationOutput} from "@cloudflare/workers-types";

import {Uri} from "../http/Uri.ts";
import {actionsPrompt} from "./Prompts.ts";

export class SuggestionsHandler {
    constructor(private ai: Ai) {
    }

    async handle(request: Request): Promise<Response> {
        const {query} = new Uri(request.url);
        const params = new URLSearchParams(query);

        const model = params.get('model') ?? "@cf/meta/llama-3-8b-instruct-awq" as any;

        const rawPrompt = params.get('prompt');
        if (!rawPrompt) return new Response('Not Found', {status: 404});

        const data = JSON.parse(rawPrompt);
        const prompt = actionsPrompt(data);

        const output: AiTextGenerationOutput = await this.ai.run(model, prompt);
        if (!('response' in output)) return new Response('Unsupported response', {status: 404});

        return new Response(output.response, {
            headers: {
                "content-type": "application/json",
            },
        });
    }
}

