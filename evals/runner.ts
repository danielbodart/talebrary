import type {CachedAi} from "./cache.ts";
import type {CoverArtInput} from "./fixtures.ts";
import type {EvalCase, EvalRun, ModelOutput, Score, Scorer, CaseResult} from "./types.ts";
import {extractText} from "../src/types.ts";
import type {SceneContext, ScopedPrompt} from "../src/types.ts";
import {generateIllustrationPrompt} from "../src/prompts/GenerateIllustrationPrompt.ts";
import {styleTransferPrompt} from "../src/prompts/StyleTransferPrompt.ts";
import {maxTokens} from "./models.ts";
import {visionJudge} from "./scorers/vision-judge.ts";

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
            const {output, cached} = await ai.run(model, prompt);
            const latencyMs = performance.now() - start;

            results.push({model, output, latencyMs, cached});

            const modelScores: Score[] = [];
            for (const scorer of scorers) {
                modelScores.push(await scorer(output, evalCase));
            }
            scores[model] = modelScores;

            const status = cached ? "cached" : `${latencyMs.toFixed(0)}ms`;
            const avg = modelScores.length > 0
                ? (modelScores.reduce((s, sc) => s + sc.value, 0) / modelScores.length).toFixed(2)
                : "n/a";
            console.log(`  ${model} [${status}] avg=${avg}`);
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

        // Step 1: generate illustration prompt using the text model
        const illustrationPrompt = generateIllustrationPrompt(evalCase.input);
        const {output: promptOutput} = await ai.run(textModel, illustrationPrompt);
        const promptText = extractText(promptOutput);

        if (!promptText) {
            console.log(`  Skipping (no prompt text from ${textModel})`);
            continue;
        }

        let sdPrompt: string;
        try {
            const parsed = JSON.parse(promptText);
            if (parsed.status === 404) {
                console.log(`  Skipping (no scene): ${parsed.reason}`);
                continue;
            }
            sdPrompt = parsed.prompt;
        } catch {
            sdPrompt = promptText;
        }

        console.log(`  SD prompt: ${sdPrompt?.slice(0, 80)}...`);

        const results: ModelOutput<string>[] = [];
        const scores: Record<string, Score[]> = {};

        for (const model of imageModels) {
            const input = model.includes("flux")
                ? {prompt: sdPrompt, num_steps: 4}
                : {prompt: sdPrompt};

            const start = performance.now();
            const {output, cached, cachePath} = await ai.run(model, input);
            const latencyMs = performance.now() - start;

            results.push({model, output: cachePath ?? String(output), latencyMs, cached});

            const modelScores: Score[] = [];
            if (enableVisionJudge && output instanceof Uint8Array) {
                const judge = visionJudge(ai, evalCase.input.scene.description);
                modelScores.push(...await judge(output));
            }
            scores[model] = modelScores;

            const status = cached ? "cached" : `${latencyMs.toFixed(0)}ms`;
            console.log(`  ${model} [${status}] ${cachePath ?? "no image"}`);
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

        // Step 1: generate illustration prompt
        const illustrationPrompt = generateIllustrationPrompt(evalCase.input);
        const {output: promptOutput} = await ai.run(textModel, illustrationPrompt);
        const promptText = extractText(promptOutput);

        if (!promptText) {
            console.log(`  Skipping (no prompt text from ${textModel})`);
            continue;
        }

        let sdPrompt: string;
        try {
            const parsed = JSON.parse(promptText);
            if (parsed.status === 404) {
                console.log(`  Skipping (no scene): ${parsed.reason}`);
                continue;
            }
            sdPrompt = parsed.prompt;
        } catch {
            sdPrompt = promptText;
        }

        // Step 2: generate source image
        const {output: sourceImage} = await ai.run(sourceImageModel, {prompt: sdPrompt});
        if (!(sourceImage instanceof Uint8Array)) {
            console.log(`  Skipping (no source image)`);
            continue;
        }
        const sourceBase64 = Buffer.from(sourceImage).toString("base64");

        const results: ModelOutput<string>[] = [];
        const scores: Record<string, Score[]> = {};

        for (const model of img2imgModels) {
            const input = model.includes("flux-2-klein")
                ? {prompt: sdPrompt, input_image_0: sourceBase64}
                : {prompt: sdPrompt, image_b64: sourceBase64, ...(model.includes("flux") ? {num_steps: 4} : {})};

            const start = performance.now();
            const {output, cached, cachePath} = await ai.run(model, input);
            const latencyMs = performance.now() - start;

            results.push({model, output: cachePath ?? String(output), latencyMs, cached});

            const modelScores: Score[] = [];
            if (enableVisionJudge && output instanceof Uint8Array) {
                const judge = visionJudge(ai, evalCase.input.scene.description);
                modelScores.push(...await judge(output));
            }
            scores[model] = modelScores;

            const status = cached ? "cached" : `${latencyMs.toFixed(0)}ms`;
            console.log(`  ${model} [${status}] ${cachePath ?? "no image"}`);
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
            const input = model.includes("flux-2-klein")
                ? {prompt, input_image_0: sourceBase64}
                : {prompt, image_b64: sourceBase64, ...(model.includes("flux") ? {num_steps: 4} : {})};

            try {
                const start = performance.now();
                const {output, cached, cachePath} = await ai.run(model, input);
                const latencyMs = performance.now() - start;

                results.push({model, output: cachePath ?? String(output), latencyMs, cached});

                const modelScores: Score[] = [];
                if (enableVisionJudge && output instanceof Uint8Array) {
                    const judge = visionJudge(ai, evalCase.input.story.description);
                    modelScores.push(...await judge(output));
                }
                scores[model] = modelScores;

                const status = cached ? "cached" : `${latencyMs.toFixed(0)}ms`;
                console.log(`  ${model} [${status}] ${cachePath ?? "no image"}`);
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
