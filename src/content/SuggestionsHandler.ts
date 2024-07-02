import type {Ai, AiTextGenerationOutput} from "@cloudflare/workers-types";

import {Uri} from "../http/Uri.ts";
import {actionsPrompt} from "./Prompts.ts";
import type {Dependency} from "../yadic/mod.ts";

export class SuggestionsHandler {
    constructor(deps: Dependency<'ai', Ai>, private ai: Ai = deps.ai) {
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

        try {
            const json = JSON.parse(output.response!);
            return new Response(JSON.stringify(json), {
                headers: {
                    "content-type": "application/json",
                },
            });
        } catch (e) {
            return new Response(`Model failed to return JSON:
${output.response!}`, {
                status: 500,
                headers: {
                    "content-type": "plain/text",
                },
            });
        }
    }
}

