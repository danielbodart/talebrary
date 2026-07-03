import {CloudflareRestAi} from "../src/bun/CloudflareRestAi.ts";
import {CloudflareAiAdapter} from "../src/ai/CloudflareAiAdapter.ts";
import {client} from "../src/http/mod.ts";
import {CachedAi} from "./cache.ts";
import {allModels, imageModels, img2imgModels, textModels} from "./models.ts";
import {suggestionTreeCases, illustrationCases, coverArtCases, sceneDetectionCases, coverArtSceneCases} from "./fixtures.ts";
import {suggestionsTreePrompt} from "../src/prompts/SuggestionsTreePrompt.ts";
import {jsonValid, schemaMatch} from "./scorers/json.ts";
import {validTree, verbsFromList, nounsFromScene, treeSize, treeDepth} from "./scorers/suggestion-tree.ts";
import {hasPrompt, matchesExpectation} from "./scorers/scene-detection.ts";
import {runTextEvals, runImageEvals, runStyleTransferEvals} from "./runner.ts";
import type {EvalRun, ModelOutput, Score} from "./types.ts";
import {mkdir} from "node:fs/promises";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;

if (!accountId || !apiToken) {
    console.error("Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in .env");
    process.exit(1);
}

const ai = new CachedAi(new CloudflareAiAdapter(new CloudflareRestAi(accountId, apiToken, client, "default")));
const enableVisionJudge = process.argv.includes("--vision-judge");
const suite = process.argv[2];

async function saveRun(name: string, run: EvalRun<any, any>): Promise<void> {
    const dir = "evals/results";
    await mkdir(dir, {recursive: true});
    const path = `${dir}/${name}-${run.timestamp}.json`;
    await Bun.write(path, JSON.stringify(run, null, 2));
    console.log(`\nSaved: ${path}`);
}

function printSummary(run: EvalRun<any, any>): void {
    console.log(`\n=== ${run.name} ===`);

    const modelStats = new Map<string, { scores: number[]; latencies: number[] }>();
    for (const c of run.cases) {
        for (const result of c.results as ModelOutput<any>[]) {
            if (!modelStats.has(result.model)) modelStats.set(result.model, {scores: [], latencies: []});
            const stats = modelStats.get(result.model)!;
            if (!result.cached) stats.latencies.push(result.latencyMs);
        }
        for (const [model, scores] of Object.entries(c.scores)) {
            if (!modelStats.has(model)) modelStats.set(model, {scores: [], latencies: []});
            modelStats.get(model)!.scores.push(...scores.map((s: Score) => s.value));
        }
    }

    console.log(`${"Model".padEnd(50)} | ${"Avg".padStart(5)} | ${"Latency".padStart(8)} | Cases`);
    console.log("-".repeat(80));

    for (const [model, {scores, latencies}] of modelStats) {
        const avg = scores.length > 0
            ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(3)
            : "n/a  ";
        const latency = latencies.length > 0
            ? `${(latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(0)}ms`
            : "cached  ";
        console.log(`${model.padEnd(50)} | ${avg.padStart(5)} | ${latency.padStart(8)} | ${run.cases.length}`);
    }
}

async function runSuggestions() {
    console.log("\n--- Suggestion Evals ---");
    const scorers = [
        jsonValid,
        schemaMatch(["people", "tree"]),
        validTree,
        verbsFromList,
        nounsFromScene,
        treeSize,
        treeDepth,
    ];
    const run = await runTextEvals(
        ai, "suggestions", suggestionTreeCases,
        allModels(textModels), suggestionsTreePrompt, scorers,
    );
    await saveRun("suggestions", run);
    printSummary(run);
}

async function runIllustrationPrompts() {
    console.log("\n--- Illustration Prompt Evals ---");
    const promptScorers = [
        jsonValid,
        schemaMatch(["prompt"]),
    ];
    const {generateIllustrationPrompt} = await import("../src/prompts/GenerateIllustrationPrompt.ts");
    const run = await runTextEvals(
        ai, "illustration-prompts", illustrationCases,
        allModels(textModels), generateIllustrationPrompt, promptScorers,
    );
    await saveRun("illustration-prompts", run);
    printSummary(run);
}

async function runImages() {
    console.log("\n--- Image Generation Evals ---");
    const run = await runImageEvals(
        ai, "images", illustrationCases,
        textModels.reference, allModels(imageModels),
        enableVisionJudge,
    );
    await saveRun("images", run);
    printSummary(run);
}

async function runStyleTransfer() {
    console.log("\n--- Style Transfer Evals ---");
    const run = await runStyleTransferEvals(
        ai, "style-transfer", coverArtCases,
        textModels.reference,
        allModels(img2imgModels),
        enableVisionJudge,
    );
    await saveRun("style-transfer", run);
    printSummary(run);
}

async function runSceneDetection() {
    console.log("\n--- Scene Detection Evals ---");
    const {generateIllustrationPrompt} = await import("../src/prompts/GenerateIllustrationPrompt.ts");
    const run = await runTextEvals(
        ai, "scene-detection", sceneDetectionCases,
        allModels(textModels),
        (c) => generateIllustrationPrompt(c.input),
        [jsonValid, hasPrompt, matchesExpectation],
    );
    await saveRun("scene-detection", run);
    printSummary(run);
}

async function runCoverArtScene() {
    console.log("\n--- Cover Art Scene Detection Evals ---");
    const {coverArtScenePrompt} = await import("../src/prompts/CoverArtScenePrompt.ts");
    const run = await runTextEvals(
        ai, "cover-art-scene", coverArtSceneCases,
        allModels(textModels),
        (c) => coverArtScenePrompt(c.story),
        [jsonValid, hasPrompt, matchesExpectation],
    );
    await saveRun("cover-art-scene", run);
    printSummary(run);
}

const suites: Record<string, () => Promise<void>> = {
    suggestions: runSuggestions,
    prompts: runIllustrationPrompts,
    "scene-detection": runSceneDetection,
    "cover-art-scene": runCoverArtScene,
    images: runImages,
    "style-transfer": runStyleTransfer,
};

if (suite && suite !== "--vision-judge" && suites[suite]) {
    await suites[suite]();
} else {
    for (const fn of Object.values(suites)) {
        await fn();
    }
}
