import {get, type Http} from "../http/mod.ts";
import type {TalebraryAi} from "../ai/TalebraryAi.ts";
import type {TalebraryBucket} from "../storage/TalebraryBucket.ts";
import type {GameStory} from "../games/GameFinder.ts";
import {styleTransferPrompt} from "../prompts/StyleTransferPrompt.ts";
import {generateIllustrationPrompt} from "../prompts/GenerateIllustrationPrompt.ts";
import {detectMimeType} from "../http/DetectMimeType.ts";
import type {Dependency} from "@bodar/yadic/types.ts";
import type {Workflow, StepConfig} from "./mod.ts";

const noRetry: StepConfig = {retries: {limit: 0, delay: 0}};

const styleTransferModel = '@cf/black-forest-labs/flux-2-klein-9b';
const styleTransferFallbackModel = '@cf/black-forest-labs/flux-2-klein-4b';
const defaultImageModel = '@cf/leonardo/phoenix-1.0';
const textModel = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

export interface CoverArtParams {
    game: GameStory;
}

export interface CoverArtResult {
    bucketKey: string;
    contentType: string;
    description?: string;
    cacheControl?: string;
}

export interface CoverArtWorkflowDeps extends
    Dependency<'http', Http>,
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

export function coverArtWorkflow(deps: CoverArtWorkflowDeps): Workflow<CoverArtParams, CoverArtResult> {
    return async ({game}, step) => {
        if (game.coverart) {
            const originalKey = `content/${game.id}/cover-art-original`;

            await step.do('fetch-and-store-original', noRetry, async () => {
                const response = await deps.http(get(game.coverart));
                if (!response.ok) throw new Error(`Failed to fetch cover art: ${response.status}`);
                const original = new Uint8Array(await response.arrayBuffer());
                await deps.bucket.put(originalKey, original, {
                    contentType: await detectMimeType(original),
                    cacheControl: 'public, max-age=31536000',
                });
            });

            const prompt = styleTransferPrompt({title: game.title, description: game.description ?? ''});

            try {
                const result = await step.do('style-transfer', noRetry, async () => {
                    const sourceImage = await readBase64(deps.bucket, originalKey);
                    const image = await deps.ai.generateImage(styleTransferModel, {prompt, sourceImage});
                    const key = `workflow-images/${crypto.randomUUID()}`;
                    const contentType = await detectMimeType(image);
                    await deps.bucket.put(key, image, {contentType});
                    return {bucketKey: key, contentType};
                });
                return result;
            } catch (e) {
                console.error('Style transfer (9b) failed:', e);
            }

            try {
                const result = await step.do('style-transfer-fallback', noRetry, async () => {
                    const sourceImage = await readBase64(deps.bucket, originalKey);
                    const image = await deps.ai.generateImage(styleTransferFallbackModel, {prompt, sourceImage});
                    const key = `workflow-images/${crypto.randomUUID()}`;
                    const contentType = await detectMimeType(image);
                    await deps.bucket.put(key, image, {contentType});
                    return {bucketKey: key, contentType};
                });
                return result;
            } catch (e) {
                console.error('Style transfer (4b) failed:', e);
            }

            const defaultPrompt = defaultBookCoverPrompt(game.title);
            const bucketKey = await step.do('generate-default', noRetry, async () => {
                const image = await deps.ai.generateImage(defaultImageModel, {prompt: defaultPrompt});
                const key = `workflow-images/${crypto.randomUUID()}`;
                await deps.bucket.put(key, image, {contentType: 'image/jpeg'});
                return key;
            });
            return {bucketKey, contentType: 'image/jpeg', description: defaultPrompt};
        }

        const describable = {title: game.title, description: game.description ?? ''};
        const data = {story: describable, scene: describable};

        const prompt = await step.do('generate-prompt', noRetry, async () => {
            const result = await deps.ai.generateText<PromptResult>(textModel, generateIllustrationPrompt(data));
            if (result.status === 404) return defaultBookCoverPrompt(game.title);
            if (result.status) throw new Error(`Prompt generation failed: ${result.statusText} - ${result.reason}`);
            return result.prompt!;
        });

        const bucketKey = await step.do('generate-image', noRetry, async () => {
            const image = await deps.ai.generateImage(defaultImageModel, {prompt});
            const key = `workflow-images/${crypto.randomUUID()}`;
            await deps.bucket.put(key, image, {contentType: 'image/jpeg'});
            return key;
        });

        return {bucketKey, contentType: 'image/jpeg', description: prompt};
    };
}

async function readBase64(bucket: TalebraryBucket, key: string): Promise<string> {
    const response = await bucket.get(key);
    if (!response.ok) throw new Error(`Failed to read ${key} from bucket: ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    return Buffer.from(bytes).toString('base64');
}
