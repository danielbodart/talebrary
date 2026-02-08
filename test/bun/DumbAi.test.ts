import {describe, expect, test} from "bun:test";
import {DumbAi} from "../../src/bun/DumbAi.ts";
import {suggestionsTreePrompt, ExampleInput, type SuggestionTree} from "../../src/prompts/SuggestionsTreePrompt.ts";
import {generateIllustrationPrompt, exampleRequest} from "../../src/prompts/GenerateIllustrationPrompt.ts";

describe("DumbAi", () => {
    const ai = new DumbAi();

    describe("suggestions", () => {
        test("can detect people and directions", async () => {
            const suggestions = await ai.generateText<SuggestionTree>("@cf/meta/llama-3.3-70b-instruct-fp8-fast", suggestionsTreePrompt(ExampleInput));
            expect(suggestions.people).toBe(true);
            expect(suggestions.tree).toHaveProperty("go");
            expect(suggestions.tree["go"]).toContain("east");
            expect(suggestions.tree).toHaveProperty("east");
            expect(suggestions.tree).toHaveProperty("look");
            expect(suggestions.tree).toHaveProperty("ask");
        });

        test("returns valid SuggestionTree shape", async () => {
            const suggestions = await ai.generateText<SuggestionTree>("@cf/meta/llama-3.3-70b-instruct-fp8-fast", suggestionsTreePrompt({
                title: "Cave",
                description: "A dark cave with dripping water"
            }));
            expect(suggestions).toHaveProperty("people");
            expect(suggestions).toHaveProperty("tree");
            expect(typeof suggestions.tree).toBe("object");
        });
    });

    describe("illustration prompts", () => {
        test("generates illustration prompt for scene context", async () => {
            const result = await ai.generateText<{prompt: string}>("@cf/meta/llama-3.3-70b-instruct-fp8-fast", generateIllustrationPrompt(exampleRequest));
            expect(result).toHaveProperty("prompt");
            expect(result.prompt).toBeString();
            expect(result.prompt.length).toBeGreaterThan(0);
        });

        test("returns error status for unparseable input", async () => {
            const prompt = generateIllustrationPrompt({
                story: {title: "Test", description: "A test"},
                scene: {title: "Empty", description: "Nothing here"},
            });
            // Override user content to not have scene structure
            prompt.messages[1] = {role: 'user', content: 'not valid json'};
            const result = await ai.generateText<{status: number}>("@cf/meta/llama-3.3-70b-instruct-fp8-fast", prompt);
            expect(result.status).toBe(500);
        });

        test("includes scene description in generated prompt", async () => {
            const result = await ai.generateText<{prompt: string}>("@cf/meta/llama-3.3-70b-instruct-fp8-fast", generateIllustrationPrompt(exampleRequest));
            expect(result.prompt).toContain(exampleRequest.scene.title);
        });
    });

    describe("image generation", () => {
        test("stable diffusion returns Uint8Array", async () => {
            const result = await ai.generateImage("@cf/bytedance/stable-diffusion-xl-lightning", {prompt: "a cat"});
            expect(result).toBeInstanceOf(Uint8Array);
        });

        test("flux returns Uint8Array", async () => {
            const result = await ai.generateImage("@cf/black-forest-labs/flux-1-schnell", {prompt: "a cat"});
            expect(result).toBeInstanceOf(Uint8Array);
        });
    });
});
