import {describe, expect, test} from "bun:test";
import {DumbAi} from "../../src/bun/DumbAi.ts";
import {suggestionsPrompt, ExamplePrompt, type Suggestions} from "../../src/prompts/SuggestionsPrompt.ts";
import {generateIllustrationPrompt, exampleRequest} from "../../src/prompts/GenerateIllustrationPrompt.ts";
import {parseAiJsonResponse} from "../../src/ai/parseAiJsonResponse.ts";

describe("DumbAi", () => {
    const ai = new DumbAi();

    describe("suggestions", () => {
        test("can detect people and directions", async () => {
            const result = await ai.run("@cf/meta/llama-3-8b-instruct-awq", suggestionsPrompt(ExamplePrompt));
            const suggestions: Suggestions = JSON.parse(result!['response']!);
            expect(suggestions.people).toBe(true);
            expect(suggestions.commands.sort()).toEqual([
                "ask", "down", "east", "examine", "give", "go", "help", "in", "inventory", "look", "north", "out", "show", "south", "talk", "tell", "up", "west"
            ]);
        });

        test("works with all supported llama models", async () => {
            for (const model of [
                "@cf/meta/llama-3-8b-instruct-awq",
                "@cf/meta/llama-3.1-8b-instruct",
                "@cf/meta/llama-3.2-3b-instruct",
                "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
            ] as const) {
                const result = await ai.run(model as any, suggestionsPrompt(ExamplePrompt));
                expect(result).toHaveProperty("response");
            }
        });

        test("returns valid Suggestions shape", async () => {
            const result = await ai.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast" as any, suggestionsPrompt({
                title: "Cave",
                description: "A dark cave with dripping water"
            }));
            const suggestions = parseAiJsonResponse(result as any);
            expect(suggestions).toHaveProperty("people");
            expect(suggestions).toHaveProperty("nouns");
            expect(suggestions).toHaveProperty("commands");
            expect(suggestions).toHaveProperty("actions");
        });
    });

    describe("illustration prompts", () => {
        test("generates illustration prompt for scene context", async () => {
            const result = await ai.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast" as any, generateIllustrationPrompt(exampleRequest));
            const parsed = parseAiJsonResponse(result as any);
            expect(parsed).toHaveProperty("prompt");
            expect(parsed.prompt).toBeString();
            expect(parsed.prompt.length).toBeGreaterThan(0);
        });

        test("returns 404 status for non-scene input", async () => {
            const prompt = generateIllustrationPrompt({
                story: {title: "Test", description: "A test"},
                scene: {title: "Empty", description: "Nothing here"},
            });
            // Override user content to not have scene structure
            prompt.messages[1] = {role: 'user', content: 'not valid json'};
            const result = await ai.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast" as any, prompt);
            const parsed = parseAiJsonResponse(result as any);
            expect(parsed.status).toBe(500);
        });

        test("includes scene description in generated prompt", async () => {
            const result = await ai.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast" as any, generateIllustrationPrompt(exampleRequest));
            const parsed = parseAiJsonResponse(result as any);
            expect(parsed.prompt).toContain(exampleRequest.scene.title);
        });
    });

    describe("image models", () => {
        test("stable diffusion returns Uint8Array", async () => {
            const result = await ai.run("@cf/bytedance/stable-diffusion-xl-lightning", {prompt: "a cat"} as any);
            expect(result).toBeInstanceOf(Uint8Array);
        });

        test("flux returns object with image field", async () => {
            const result: any = await ai.run("@cf/black-forest-labs/flux-1-schnell" as any, {prompt: "a cat"});
            expect(result).toHaveProperty("image");
            expect(typeof result.image).toBe("string");
        });
    });

    test("throws for unknown model", async () => {
        await expect(ai.run("unknown-model" as any, {} as any)).rejects.toThrow("Model unknown-model not found");
    });
});
