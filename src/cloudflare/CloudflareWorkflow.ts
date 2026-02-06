import type {Params} from "@cloudflare/workers-types";
// @ts-ignore
import {WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep} from "cloudflare:workers";
import type {IllustrationDependencies} from "../content/IllustrationHandler.ts";
import {generateIllustrationPrompt} from "../prompts/GenerateIllustrationPrompt.ts";
import {_try} from "../content/IllustrationHandler.ts";
import type {FluxResponse} from "../types.ts";

interface IllustrationEvent {
    model: string;
    prompt: string;
}

export class CloudflareWorkflow extends WorkflowEntrypoint<Env, Params> {
    constructor(private deps: IllustrationDependencies) {
        super();
    }

    async run(event: WorkflowEvent<IllustrationEvent>, step: WorkflowStep) {
        const {model = 'llama+stable-diffusion', prompt} = event.payload;
        if (!prompt) throw new Error('Prompt is required');

        const data = JSON.parse(prompt);

        // Step 1: Generate the visual description using LLama
        const description = await step.do('generate_description', async () => {
            if (!model.startsWith('llama+')) {
                return { prompt: data }; // Use raw prompt if not using LLama
            }

            const result: any = await this.deps.ai.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', generateIllustrationPrompt(data));
            return _try(() => JSON.parse(result.response), (e) => ({
                status: 500,
                statusText: 'Expected JSON response',
                reason: String(e)
            }));
        });

        if (description.status) {
            throw new Error(`Failed to generate description: ${description.statusText} - ${description.reason}`);
        }

        // Step 2: Generate the image based on the description
        return await step.do('generate_image', async () => {
            if (model.endsWith('flux')) {
                const result = await this.deps.ai.run('@cf/black-forest-labs/flux-1-schnell', description) as FluxResponse;
                const imageData = await fetch(`data:application/octet;base64,${result.image}`);
                return {
                    image: await imageData.arrayBuffer(),
                    contentType: 'image/jpeg',
                    description: description.prompt
                };
            }

            // Default to Stable Diffusion XL Lightning
            const image = await this.deps.ai.run('@cf/bytedance/stable-diffusion-xl-lightning', description);
            return {
                image,
                contentType: 'image/jpeg',
                description: description.prompt
            };
        });
    }
}
