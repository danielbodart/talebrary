import {Uri} from "../http/Uri.ts";
import {suggestionsPrompt, type Suggestions} from "../prompts/SuggestionsPrompt.ts";
import type {Dependency} from "@bodar/yadic/types.ts";
import type {TalebraryAi} from "../ai/TalebraryAi.ts";

export class SuggestionsHandler {
    constructor(deps: Dependency<'ai', TalebraryAi>, private ai: TalebraryAi = deps.ai) {
    }

    async handle(request: Request): Promise<Response> {
        const {query} = new Uri(request.url);
        const params = new URLSearchParams(query);

        const model = params.get('model') ?? "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

        const rawPrompt = params.get('prompt');
        if (!rawPrompt) return new Response('Not Found', {status: 404});

        const data = JSON.parse(rawPrompt);
        const prompt = suggestionsPrompt(data);

        try {
            const json = await this.ai.generateText<Suggestions>(model, prompt);
            return new Response(JSON.stringify(json), {
                headers: {
                    "content-type": "application/json",
                },
            });
        } catch (e) {
            return new Response(`Model failed to return JSON:
${e}`, {
                status: 500,
                headers: {
                    "content-type": "plain/text",
                },
            });
        }
    }
}
