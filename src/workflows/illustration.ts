import type {TalebraryAi} from "../ai/TalebraryAi.ts";
import type {TalebraryBucket} from "../storage/TalebraryBucket.ts";
import {generateIllustrationPrompt} from "../prompts/GenerateIllustrationPrompt.ts";
import {illustrationPrompt} from "../prompts/IllustrationPrompt.ts";
import type {Dependency} from "@bodar/yadic/types.ts";
import type {Workflow, StepConfig} from "./mod.ts";

const noRetry: StepConfig = {retries: {limit: 0, delay: "1 second"}};

const defaultImageModel = '@cf/leonardo/phoenix-1.0';
const textModel = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

export interface IllustrationParams {
    data: any;
    imageModel?: string;
    path: string;
}

export interface IllustrationResult {
    bucketKey: string;
    contentType: string;
    description?: string;
}

export interface IllustrationWorkflowDeps extends
    Dependency<'ai', TalebraryAi>,
    Dependency<'bucket', TalebraryBucket> {
}

interface PromptResult {
    prompt?: string;
    status?: number;
    statusText?: string;
    reason?: string;
}

function defaultBookCoverPrompt(title: string): string {
    return `Illustration of a leather-bound book with the title "${title}" embossed on the cover, resting on a wooden shelf in a warm, cozy library filled with books. Soft lamplight, rich wood tones. Graphic novel style, bold linework, rich colours, detailed hand-drawn. Vintage adventure book aesthetic. No border or frame.`;
}

export function illustrationWorkflow(deps: IllustrationWorkflowDeps): Workflow<IllustrationParams, IllustrationResult> {
    return async ({data, imageModel = defaultImageModel, path}, step) => {
        if (data.scene) {
            const prompt = await step.do('generate-prompt', noRetry, async () => {
                let result: PromptResult;
                try {
                    result = await deps.ai.generateText<PromptResult>(textModel, generateIllustrationPrompt(data));
                } catch (e) {
                    result = {status: 500, statusText: 'Expected JSON response', reason: String(e)};
                }
                if (result.status === 404) {
                    const title = data.story?.title ?? data.title ?? 'Unknown';
                    return defaultBookCoverPrompt(title);
                }
                if (result.status) throw new Error(`${result.statusText}: ${result.reason}`);
                return result.prompt!;
            });

            const bucketKey = await step.do('generate-image', noRetry, async () => {
                const image = await deps.ai.generateImage(imageModel, {prompt});
                const key = `workflow-images/${crypto.randomUUID()}`;
                await deps.bucket.put(key, image, {contentType: 'image/jpeg'});
                return key;
            });

            return {bucketKey, contentType: 'image/jpeg', description: prompt};
        }

        const promptText = illustrationPrompt(path, data);
        const bucketKey = await step.do('generate-image', noRetry, async () => {
            const image = await deps.ai.generateImage(imageModel, {prompt: promptText});
            const key = `workflow-images/${crypto.randomUUID()}`;
            await deps.bucket.put(key, image, {contentType: 'image/jpeg'});
            return key;
        });

        return {bucketKey, contentType: 'image/jpeg'};
    };
}
