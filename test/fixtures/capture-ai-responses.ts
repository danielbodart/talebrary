/**
 * Capture real AI responses from Cloudflare REST API for use as test fixtures.
 *
 * Run with: CLOUDFLARE_ACCOUNT_ID=xxx CLOUDFLARE_API_TOKEN=xxx bun run test/fixtures/capture-ai-responses.ts
 *
 * This captures:
 * 1. Suggestions responses for various scene descriptions
 * 2. Illustration prompt generation responses
 * 3. Image generation is skipped (returns binary data, not useful as fixtures)
 */
import {CloudflareRestAi} from "../../src/bun/CloudflareRestAi.ts";
import {client} from "../../src/http/mod.ts";
import {suggestionsTreePrompt, ExampleInput} from "../../src/prompts/SuggestionsTreePrompt.ts";
import {generateIllustrationPrompt, exampleRequest} from "../../src/prompts/GenerateIllustrationPrompt.ts";
import type {SceneContext} from "../../src/types.ts";

const {CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN} = process.env;
if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    console.error("Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN environment variables");
    process.exit(1);
}

const ai = new CloudflareRestAi(CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, client);
const model = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

const scenes = [
    ExampleInput,
    {title: "Dark Cave", description: "You are in a dark cave. Water drips from the ceiling. To the north, a faint light glimmers."},
    {title: "Ship Deck", description: "You stand on the deck of a sailing ship. The captain barks orders to his crew. A chest sits near the mast."},
    {title: "Empty Room", description: "This is a bare room with white walls. There is nothing here."},
];

const sceneContexts: SceneContext[] = [
    exampleRequest,
    {
        story: {title: "Zork", description: "An underground adventure where you explore the Great Underground Empire"},
        scene: {title: "West of House", description: "You are standing in an open field west of a white house, with a boarded front door."},
    },
    {
        story: {title: "Photopia", description: "A story about love, loss, and the stars"},
        scene: {title: "On the Red Planet", description: "The rust-colored landscape stretches endlessly. Two moons hang low."},
        previous: {title: "Launch", description: "You watched Earth shrink to a blue dot through the porthole."},
    },
];

interface CapturedFixture {
    input: any;
    prompt: any;
    output: any;
    capturedAt: string;
}

async function captureSuggestions() {
    const fixtures: CapturedFixture[] = [];
    for (const scene of scenes) {
        const prompt = suggestionsTreePrompt(scene);
        console.log(`Capturing suggestions for: ${scene.title}`);
        try {
            const output = await ai.run(model, prompt as any);
            fixtures.push({input: scene, prompt, output, capturedAt: new Date().toISOString()});
            console.log(`  OK:`, JSON.stringify(output).slice(0, 100));
        } catch (e) {
            console.error(`  FAILED:`, e);
        }
    }
    return fixtures;
}

async function captureIllustrationPrompts() {
    const fixtures: CapturedFixture[] = [];
    for (const context of sceneContexts) {
        const prompt = generateIllustrationPrompt(context);
        console.log(`Capturing illustration prompt for: ${context.scene.title}`);
        try {
            const output = await ai.run(model, prompt as any);
            fixtures.push({input: context, prompt, output, capturedAt: new Date().toISOString()});
            console.log(`  OK:`, JSON.stringify(output).slice(0, 100));
        } catch (e) {
            console.error(`  FAILED:`, e);
        }
    }
    return fixtures;
}

const suggestions = await captureSuggestions();
const illustrations = await captureIllustrationPrompts();

const allFixtures = {suggestions, illustrations};
const outPath = `${import.meta.dir}/ai-responses.json`;
await Bun.write(outPath, JSON.stringify(allFixtures, null, 2));
console.log(`\nWritten ${suggestions.length + illustrations.length} fixtures to ${outPath}`);
