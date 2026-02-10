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
    image: Uint8Array;
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
            const original = await step.do('fetch-original', noRetry, async () => {
                const response = await deps.http(get(game.coverart));
                if (!response.ok) throw new Error(`Failed to fetch cover art: ${response.status}`);
                return new Uint8Array(await response.arrayBuffer());
            });

            await step.do('store-original', noRetry, async () => {
                await deps.bucket.put(`content/${game.id}/cover-art-original`, original, {
                    contentType: await detectMimeType(original),
                    cacheControl: 'public, max-age=31536000',
                });
            });

            const sourceImage = Buffer.from(original).toString('base64');
            const prompt = styleTransferPrompt({title: game.title, description: game.description ?? ''});

            try {
                const stylized = await step.do('style-transfer', noRetry, async () =>
                    deps.ai.generateImage(styleTransferModel, {prompt, sourceImage})
                );
                return {image: stylized, contentType: await detectMimeType(stylized)};
            } catch (e) {
                console.error('Style transfer (9b) failed:', e);
            }

            try {
                const stylized = await step.do('style-transfer-fallback', noRetry, async () =>
                    deps.ai.generateImage(styleTransferFallbackModel, {prompt, sourceImage})
                );
                return {image: stylized, contentType: await detectMimeType(stylized)};
            } catch (e) {
                console.error('Style transfer (4b) failed:', e);
            }

            const defaultPrompt = defaultBookCoverPrompt(game.title);
            const generated = await step.do('generate-default', noRetry, () =>
                deps.ai.generateImage(defaultImageModel, {prompt: defaultPrompt})
            );
            return {image: generated, contentType: 'image/jpeg', description: defaultPrompt};
        }

        const describable = {title: game.title, description: game.description ?? ''};
        const data = {story: describable, scene: describable};

        const prompt = await step.do('generate-prompt', noRetry, async () => {
            const result = await deps.ai.generateText<PromptResult>(textModel, generateIllustrationPrompt(data));
            if (result.status === 404) return defaultBookCoverPrompt(game.title);
            if (result.status) throw new Error(`Prompt generation failed: ${result.statusText} - ${result.reason}`);
            return result.prompt!;
        });

        const image = await step.do('generate-image', noRetry, () =>
            deps.ai.generateImage(defaultImageModel, {prompt})
        );

        return {image, contentType: 'image/jpeg', description: prompt};
    };
}
