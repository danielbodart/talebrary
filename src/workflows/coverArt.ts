import {get, type Http} from "../http/mod.ts";
import type {TalebraryAi} from "../ai/TalebraryAi.ts";
import type {TalebraryBucket} from "../storage/TalebraryBucket.ts";
import type {GameStory} from "../games/GameFinder.ts";
import {stylePrompt} from "../prompts/StyleTransferPrompt.ts";
import {coverArtScenePrompt} from "../prompts/CoverArtScenePrompt.ts";
import {detectMimeType} from "../http/DetectMimeType.ts";
import type {Dependency} from "@bodar/yadic/types.ts";
import type {Workflow, StepConfig} from "./mod.ts";

const noRetry: StepConfig = {retries: {limit: 0, delay: 0}};

const styleTransferModel = '@cf/black-forest-labs/flux-2-klein-9b';
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
    errors?: string[];
}

export interface CoverArtWorkflowDeps extends
    Dependency<'http', Http>,
    Dependency<'ai', TalebraryAi>,
    Dependency<'bucket', TalebraryBucket> {
}

interface SceneResult {
    prompt?: string;
    status?: number;
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

            const errors: string[] = [];

            // Step 1: Simple style transfer with no context
            try {
                const result = await step.do('style-transfer', noRetry, async () => {
                    const sourceImage = await readBase64(deps.bucket, originalKey);
                    const image = await deps.ai.generateImage(styleTransferModel, {prompt: stylePrompt, sourceImage});
                    return await storeImage(deps.bucket, image);
                });
                return result;
            } catch (e: any) {
                const msg = `style-transfer: ${e?.message ?? e}`;
                console.error(msg);
                errors.push(msg);
            }

            // Step 2: Style transfer with LLM-generated scene description
            try {
                const result = await step.do('style-transfer-scene', noRetry, async () => {
                    const sceneResult = await deps.ai.generateText<SceneResult>(textModel, coverArtScenePrompt({
                        title: game.title,
                        description: game.description ?? '',
                    }));
                    if (!sceneResult?.prompt) throw new Error('No scene extracted from description');
                    const prompt = `${stylePrompt} ${sceneResult.prompt}`;
                    const sourceImage = await readBase64(deps.bucket, originalKey);
                    const image = await deps.ai.generateImage(styleTransferModel, {prompt, sourceImage});
                    return await storeImage(deps.bucket, image);
                });
                return result;
            } catch (e: any) {
                const msg = `style-transfer-scene: ${e?.message ?? e}`;
                console.error(msg);
                errors.push(msg);
            }

            // Step 3: Default fallback — text-to-image with phoenix
            const defaultPrompt = defaultBookCoverPrompt(game.title);
            const result = await step.do('generate-default', noRetry, async () => {
                const image = await deps.ai.generateImage(defaultImageModel, {prompt: defaultPrompt});
                return await storeImage(deps.bucket, image);
            });
            return {...result, description: defaultPrompt, errors};
        }

        // No cover art — generate from scene description
        const describable = {title: game.title, description: game.description ?? ''};

        const prompt = await step.do('generate-prompt', noRetry, async () => {
            const sceneResult = await deps.ai.generateText<SceneResult>(textModel, coverArtScenePrompt(describable));
            if (sceneResult?.prompt) return `${stylePrompt} ${sceneResult.prompt}`;
            return defaultBookCoverPrompt(game.title);
        });

        const result = await step.do('generate-image', noRetry, async () => {
            const image = await deps.ai.generateImage(defaultImageModel, {prompt});
            return await storeImage(deps.bucket, image);
        });

        return {...result, description: prompt};
    };
}

async function readBase64(bucket: TalebraryBucket, key: string): Promise<string> {
    const response = await bucket.get(key);
    if (!response.ok) throw new Error(`Failed to read ${key} from bucket: ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
}

async function storeImage(bucket: TalebraryBucket, image: Uint8Array): Promise<{bucketKey: string; contentType: string}> {
    const key = `workflow-images/${crypto.randomUUID()}`;
    const contentType = await detectMimeType(image);
    await bucket.put(key, image, {contentType});
    return {bucketKey: key, contentType};
}
