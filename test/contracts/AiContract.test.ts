import {describe, expect, test} from "bun:test";
import {DumbAi} from "../../src/bun/DumbAi.ts";
import {CloudflareRestAi} from "../../src/bun/CloudflareRestAi.ts";
import {suggestionsPrompt, ExamplePrompt} from "../../src/prompts/SuggestionsPrompt.ts";
import {generateIllustrationPrompt, exampleRequest} from "../../src/prompts/GenerateIllustrationPrompt.ts";
import {parseAiJsonResponse} from "../../src/ai/parseAiJsonResponse.ts";

/**
 * Contract tests for Ai implementations.
 *
 * Both DumbAi and CloudflareRestAi (with canned Http) must satisfy the same contract:
 * - Text models return {response: string} where the string is valid JSON
 * - Image models return Uint8Array (stable-diffusion) or {image: string} (flux)
 * - Suggestions response satisfies the Suggestions shape
 * - Illustration prompt response has a {prompt: string} shape
 */
function aiContractTests(name: string, createAi: () => any) {
    describe(`${name} - Ai contract`, () => {
        describe("text generation", () => {
            test("suggestions: returns response with valid JSON string", async () => {
                const ai = createAi();
                const result = await ai.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", suggestionsPrompt(ExamplePrompt));
                expect(result).toHaveProperty("response");

                const parsed = parseAiJsonResponse(result);
                expect(parsed).toHaveProperty("commands");
                expect(parsed).toHaveProperty("people");
                expect(parsed).toHaveProperty("nouns");
                expect(parsed).toHaveProperty("actions");
                expect((parsed as any).commands).toBeArray();
            });

            test("illustration prompt: returns response with prompt field", async () => {
                const ai = createAi();
                const result = await ai.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", generateIllustrationPrompt(exampleRequest));
                expect(result).toHaveProperty("response");

                const parsed = parseAiJsonResponse(result);
                expect(parsed).toHaveProperty("prompt");
                expect((parsed as any).prompt).toBeString();
            });
        });

        describe("image generation", () => {
            test("stable-diffusion: returns Uint8Array", async () => {
                const ai = createAi();
                const result = await ai.run("@cf/bytedance/stable-diffusion-xl-lightning", {prompt: "a cat"});
                expect(result).toBeInstanceOf(Uint8Array);
            });

            test("flux: returns object with image string", async () => {
                const ai = createAi();
                const result = await ai.run("@cf/black-forest-labs/flux-1-schnell", {prompt: "a cat"});
                expect(result).toHaveProperty("image");
                expect(typeof result.image).toBe("string");
            });
        });
    });
}

// DumbAi - the in-memory test double
aiContractTests("DumbAi", () => new DumbAi());

// CloudflareRestAi - with canned HTTP responses that simulate the real API
aiContractTests("CloudflareRestAi", () => {
    const cannedSuggestionsResponse = {
        actions: ["examine cave", "go north"],
        commands: ["examine", "look", "north", "go"],
        nouns: ["cave", "light"],
        people: false
    };
    const cannedIllustrationResponse = {
        prompt: "Dark cave entrance, dripping water, faint light at end. Style: fantasy illustration."
    };

    return new CloudflareRestAi("test-account", "test-token", async (request) => {
        const url = new URL(request.url);
        const model = url.pathname.split('/ai/run/')[1];
        const body = await request.json() as any;

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
        const isIllustration = body.messages?.some((m: any) => m.content?.includes('stable diffusion'));
        const responseData = isIllustration ? cannedIllustrationResponse : cannedSuggestionsResponse;

        return new Response(JSON.stringify({result: {response: JSON.stringify(responseData)}}), {
            headers: {"content-type": "application/json"},
        });
    });
});
