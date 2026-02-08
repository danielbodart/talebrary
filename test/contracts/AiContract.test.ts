import {describe, expect, test} from "bun:test";
import {DumbAi} from "../../src/bun/DumbAi.ts";
import {CloudflareRestAi} from "../../src/bun/CloudflareRestAi.ts";
import {CloudflareAiAdapter} from "../../src/ai/CloudflareAiAdapter.ts";
import {suggestionsPrompt, ExamplePrompt} from "../../src/prompts/SuggestionsPrompt.ts";
import {generateIllustrationPrompt, exampleRequest} from "../../src/prompts/GenerateIllustrationPrompt.ts";
import type {TalebraryAi} from "../../src/ai/TalebraryAi.ts";

/**
 * Contract tests for TalebraryAi implementations.
 *
 * Both DumbAi and CloudflareAiAdapter (with canned Http) must satisfy the same contract:
 * - generateText returns parsed objects directly
 * - generateImage returns Uint8Array
 */
function aiContractTests(name: string, createAi: () => TalebraryAi) {
    describe(`${name} - TalebraryAi contract`, () => {
        describe("text generation", () => {
            test("suggestions: returns parsed object with expected fields", async () => {
                const ai = createAi();
                const result = await ai.generateText("@cf/meta/llama-3.3-70b-instruct-fp8-fast", suggestionsPrompt(ExamplePrompt));
                expect(result).toHaveProperty("commands");
                expect(result).toHaveProperty("people");
                expect(result).toHaveProperty("nouns");
                expect(result).toHaveProperty("actions");
                expect(result.commands).toBeArray();
            });

            test("illustration prompt: returns parsed object with prompt field", async () => {
                const ai = createAi();
                const result = await ai.generateText("@cf/meta/llama-3.3-70b-instruct-fp8-fast", generateIllustrationPrompt(exampleRequest));
                expect(result).toHaveProperty("prompt");
                expect(result.prompt).toBeString();
            });
        });

        describe("image generation", () => {
            test("stable-diffusion: returns Uint8Array", async () => {
                const ai = createAi();
                const result = await ai.generateImage("@cf/bytedance/stable-diffusion-xl-lightning", {prompt: "a cat"});
                expect(result).toBeInstanceOf(Uint8Array);
            });

            test("flux: returns Uint8Array", async () => {
                const ai = createAi();
                const result = await ai.generateImage("@cf/black-forest-labs/flux-1-schnell", {prompt: "a cat"});
                expect(result).toBeInstanceOf(Uint8Array);
            });
        });
    });
}

// DumbAi - the in-memory test double
aiContractTests("DumbAi", () => new DumbAi());

// CloudflareAiAdapter wrapping CloudflareRestAi with canned HTTP responses
aiContractTests("CloudflareAiAdapter", () => {
    const cannedSuggestionsResponse = {
        actions: ["examine cave", "go north"],
        commands: ["examine", "look", "north", "go"],
        nouns: ["cave", "light"],
        people: false
    };
    const cannedIllustrationResponse = {
        prompt: "Dark cave entrance, dripping water, faint light at end. Style: fantasy illustration."
    };

    const restAi = new CloudflareRestAi("test-account", "test-token", async (request) => {
        const url = new URL(request.url);
        const model = url.pathname.split('/ai/run/')[1];

        if (model === "@cf/bytedance/stable-diffusion-xl-lightning") {
            return new Response(new Uint8Array([0xFF, 0xD8, 0xFF]), {
                headers: {"content-type": "image/jpeg"},
            });
        }

        if (model === "@cf/black-forest-labs/flux-1-schnell") {
            return new Response(JSON.stringify({result: {image: "base64data"}}), {
                headers: {"content-type": "application/json"},
            });
        }

        // Text generation: detect suggestion vs illustration by checking prompt content
        const body = await request.json() as any;
        const isIllustration = body.messages?.some((m: any) => m.content?.includes('stable diffusion'));
        const responseData = isIllustration ? cannedIllustrationResponse : cannedSuggestionsResponse;

        return new Response(JSON.stringify({result: {response: JSON.stringify(responseData)}}), {
            headers: {"content-type": "application/json"},
        });
    });

    return new CloudflareAiAdapter(restAi);
});
