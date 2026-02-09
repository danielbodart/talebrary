import type {Params} from "@cloudflare/workers-types";
// @ts-ignore
import {WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep} from "cloudflare:workers";
import type {IllustrationDependencies} from "../content/IllustrationHandler.ts";
import {defaultImageModel} from "../content/IllustrationHandler.ts";
import {generateIllustrationPrompt} from "../prompts/GenerateIllustrationPrompt.ts";

interface IllustrationEvent {
    prompt: string;
}

interface PromptResult {
    prompt?: string;
    status?: number;
    statusText?: string;
    reason?: string;
}

export class CloudflareWorkflow extends WorkflowEntrypoint<Env, Params> {
    constructor(private deps: IllustrationDependencies) {
        super();
    }

    async run(event: WorkflowEvent<IllustrationEvent>, step: WorkflowStep) {
        const {prompt} = event.payload;
        if (!prompt) throw new Error('Prompt is required');

        const data = JSON.parse(prompt);

        // Step 1: Generate the visual description using LLama
        const description = await step.do('generate_description', async () => {
            return this.deps.ai.generateText<PromptResult>('@cf/meta/llama-3.3-70b-instruct-fp8-fast', generateIllustrationPrompt(data));
        });

        if (description.status) {
            throw new Error(`Failed to generate description: ${description.statusText} - ${description.reason}`);
        }

        // Step 2: Generate the image based on the description
        return await step.do('generate_image', async () => {
            const image = await this.deps.ai.generateImage(defaultImageModel, {prompt: description.prompt!});
            return {
                image,
                contentType: 'image/jpeg',
                description: description.prompt
            };
        });
    }
}
