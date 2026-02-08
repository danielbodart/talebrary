import type {CachedAi} from "./cache.ts";
import type {CoverArtInput} from "./fixtures.ts";
import type {EvalCase, EvalRun, ModelOutput, Score, Scorer, CaseResult} from "./types.ts";
import type {SceneContext, ScopedPrompt} from "../src/types.ts";
import {generateIllustrationPrompt} from "../src/prompts/GenerateIllustrationPrompt.ts";
import {styleTransferPrompt} from "../src/prompts/StyleTransferPrompt.ts";
import {maxTokens} from "./models.ts";
import {visionJudge} from "./scorers/vision-judge.ts";

interface PromptResult {
    prompt?: string;
    status?: number;
    reason?: string;
}

export async function runTextEvals<I>(
    ai: CachedAi,
    name: string,
    cases: EvalCase<I>[],
    models: string[],
    promptFn: (input: I) => ScopedPrompt,
    scorers: Scorer<any>[],
): Promise<EvalRun<I, any>> {
    const caseResults: CaseResult<I, any>[] = [];

    for (const evalCase of cases) {
        const results: ModelOutput<any>[] = [];
        const scores: Record<string, Score[]> = {};

        for (const model of models) {
            const prompt = {...promptFn(evalCase.input), ...(maxTokens[model] ? {max_tokens: maxTokens[model]} : {})};
            const start = performance.now();
            const output = await ai.generateText(model, prompt);
            const latencyMs = performance.now() - start;

            results.push({model, output, latencyMs, cached: false});

            const modelScores: Score[] = [];
            for (const scorer of scorers) {
                modelScores.push(await scorer(output, evalCase));
            }
            scores[model] = modelScores;

            const avg = modelScores.length > 0
                ? (modelScores.reduce((s, sc) => s + sc.value, 0) / modelScores.length).toFixed(2)
                : "n/a";
            console.log(`  ${model} [${latencyMs.toFixed(0)}ms] avg=${avg}`);
        }

        caseResults.push({case: evalCase, results, scores});
    }

    return {name, timestamp: Date.now(), cases: caseResults};
}

export async function runImageEvals(
    ai: CachedAi,
    name: string,
    cases: EvalCase<SceneContext>[],
    textModel: string,
    imageModels: string[],
    enableVisionJudge: boolean,
): Promise<EvalRun<SceneContext, string>> {
    const caseResults: CaseResult<SceneContext, string>[] = [];

    for (const evalCase of cases) {
        console.log(`\nCase: ${evalCase.name}`);

        const promptResult = await ai.generateText<PromptResult>(textModel, generateIllustrationPrompt(evalCase.input));

        if (promptResult.status === 404) {
            console.log(`  Skipping (no scene): ${promptResult.reason}`);
            continue;
        }

        const sdPrompt = promptResult.prompt;
        if (!sdPrompt) {
            console.log(`  Skipping (no prompt text from ${textModel})`);
            continue;
        }

        console.log(`  SD prompt: ${sdPrompt.slice(0, 80)}...`);

        const results: ModelOutput<string>[] = [];
        const scores: Record<string, Score[]> = {};

        for (const model of imageModels) {
            const input = model.includes("flux")
                ? {prompt: sdPrompt, num_steps: 4}
                : {prompt: sdPrompt};

            const start = performance.now();
            const output = await ai.generateImage(model, input);
            const latencyMs = performance.now() - start;

            results.push({model, output: String(output), latencyMs, cached: false});

            const modelScores: Score[] = [];
            if (enableVisionJudge) {
                const judge = visionJudge(ai, evalCase.input.scene.description);
                modelScores.push(...await judge(output));
            }
            scores[model] = modelScores;

            console.log(`  ${model} [${latencyMs.toFixed(0)}ms]`);
        }

        caseResults.push({case: evalCase, results, scores});
    }

    return {name, timestamp: Date.now(), cases: caseResults};
}

export async function runImg2ImgEvals(
    ai: CachedAi,
    name: string,
    cases: EvalCase<SceneContext>[],
    textModel: string,
    sourceImageModel: string,
    img2imgModels: string[],
    enableVisionJudge: boolean,
): Promise<EvalRun<SceneContext, string>> {
    const caseResults: CaseResult<SceneContext, string>[] = [];

    for (const evalCase of cases) {
        console.log(`\nCase: ${evalCase.name}`);

        const promptResult = await ai.generateText<PromptResult>(textModel, generateIllustrationPrompt(evalCase.input));

        if (promptResult.status === 404) {
            console.log(`  Skipping (no scene): ${promptResult.reason}`);
            continue;
        }

        const sdPrompt = promptResult.prompt;
        if (!sdPrompt) {
            console.log(`  Skipping (no prompt text from ${textModel})`);
            continue;
        }

        // Step 2: generate source image
        const sourceImage = await ai.generateImage(sourceImageModel, {prompt: sdPrompt});
        const sourceBase64 = Buffer.from(sourceImage).toString("base64");

        const results: ModelOutput<string>[] = [];
        const scores: Record<string, Score[]> = {};

        for (const model of img2imgModels) {
            const start = performance.now();
            const output = await ai.generateImage(model, {prompt: sdPrompt, sourceImage: sourceBase64});
            const latencyMs = performance.now() - start;

            results.push({model, output: String(output), latencyMs, cached: false});

            const modelScores: Score[] = [];
            if (enableVisionJudge) {
                const judge = visionJudge(ai, evalCase.input.scene.description);
                modelScores.push(...await judge(output));
            }
            scores[model] = modelScores;

            console.log(`  ${model} [${latencyMs.toFixed(0)}ms]`);
        }

        caseResults.push({case: evalCase, results, scores});
    }

    return {name, timestamp: Date.now(), cases: caseResults};
}

export async function runStyleTransferEvals(
    ai: CachedAi,
    name: string,
    cases: EvalCase<CoverArtInput>[],
    img2imgModels: string[],
    enableVisionJudge: boolean,
): Promise<EvalRun<CoverArtInput, string>> {
    const caseResults: CaseResult<CoverArtInput, string>[] = [];

    for (const evalCase of cases) {
        console.log(`\nCase: ${evalCase.name}`);

        const imageData = await Bun.file(evalCase.input.imagePath).arrayBuffer();
        const sourceBase64 = Buffer.from(imageData).toString("base64");
        const prompt = styleTransferPrompt(evalCase.input.story);
        console.log(`  Prompt: ${prompt.slice(0, 80)}...`);

        const results: ModelOutput<string>[] = [];
        const scores: Record<string, Score[]> = {};

        for (const model of img2imgModels) {
            try {
                const start = performance.now();
                const output = await ai.generateImage(model, {prompt, sourceImage: sourceBase64});
                const latencyMs = performance.now() - start;

                results.push({model, output: String(output), latencyMs, cached: false});

                const modelScores: Score[] = [];
                if (enableVisionJudge) {
                    const judge = visionJudge(ai, evalCase.input.story.description);
                    modelScores.push(...await judge(output));
                }
                scores[model] = modelScores;

                console.log(`  ${model} [${latencyMs.toFixed(0)}ms]`);
            } catch (e: any) {
                console.log(`  ${model} [error] ${e.message?.slice(0, 80)}`);
                results.push({model, output: `error: ${e.message}`, latencyMs: 0, cached: false});
                scores[model] = [];
            }
        }

        caseResults.push({case: evalCase, results, scores});
    }

    return {name, timestamp: Date.now(), cases: caseResults};
}
