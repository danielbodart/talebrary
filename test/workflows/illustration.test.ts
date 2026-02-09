import {describe, expect, test} from "bun:test";
import {illustrationWorkflow} from "../../src/workflows/illustration.ts";
import {InMemoryStep} from "../../src/workflows/mod.ts";
import {DumbAi} from "../../src/bun/DumbAi.ts";
import {exampleRequest} from "../../src/prompts/GenerateIllustrationPrompt.ts";
import type {TalebraryAi} from "../../src/ai/TalebraryAi.ts";
import type {Describable} from "../../src/types.ts";

const dumbAi = new DumbAi();

describe("illustrationWorkflow", () => {
    describe("scene context (multi-step)", () => {
        test("generates prompt then image", async () => {
            const step = new InMemoryStep();
            const workflow = illustrationWorkflow({ai: dumbAi});
            const result = await workflow({data: exampleRequest, path: '/content/123/art'}, step);

            expect(result.contentType).toBe("image/jpeg");
            expect(result.description).toBeString();
            expect(result.description!.length).toBeGreaterThan(0);
            expect(step.results.has('generate-prompt')).toBe(true);
            expect(step.results.has('generate-image')).toBe(true);
        });

        test("falls back to book cover prompt when AI returns 404", async () => {
            const noSceneAi: TalebraryAi = {
                generateText: async () => ({status: 404, statusText: "No Scene Found", reason: "Not visual"}) as any,
                generateImage: async () => new Uint8Array(0),
            };
            const workflow = illustrationWorkflow({ai: noSceneAi});
            const result = await workflow({data: exampleRequest, path: '/content/123/art'}, new InMemoryStep());

            expect(result.description).toContain(exampleRequest.story.title);
            expect(result.contentType).toBe("image/jpeg");
        });

        test("throws when text generation returns error status", async () => {
            const errorAi: TalebraryAi = {
                generateText: async () => ({status: 500, statusText: "Server Error", reason: "Overloaded"}) as any,
                generateImage: async () => new Uint8Array(0),
            };
            const workflow = illustrationWorkflow({ai: errorAi});

            expect(workflow({data: exampleRequest, path: '/content/123/art'}, new InMemoryStep()))
                .rejects.toThrow("Server Error");
        });

        test("throws when text generation throws", async () => {
            const badAi: TalebraryAi = {
                generateText: async () => { throw new Error("not valid json"); },
                generateImage: async () => new Uint8Array(0),
            };
            const workflow = illustrationWorkflow({ai: badAi});

            expect(workflow({data: exampleRequest, path: '/content/123/art'}, new InMemoryStep()))
                .rejects.toThrow("Expected JSON response");
        });

        test("throws when image generation fails", async () => {
            const badImageAi: TalebraryAi = {
                generateText: async () => ({prompt: "a test prompt"}) as any,
                generateImage: async () => { throw new Error("model unavailable"); },
            };
            const workflow = illustrationWorkflow({ai: badImageAi});

            expect(workflow({data: exampleRequest, path: '/content/123/art'}, new InMemoryStep()))
                .rejects.toThrow("model unavailable");
        });
    });

    describe("direct prompt (single step)", () => {
        test("generates image from direct prompt", async () => {
            const data: Describable = {title: "Adventure", description: "A great story"};
            const step = new InMemoryStep();
            const workflow = illustrationWorkflow({ai: dumbAi});
            const result = await workflow({data, path: '/content/123/art'}, step);

            expect(result.contentType).toBe("image/jpeg");
            expect(result.description).toBeUndefined();
            expect(step.results.has('generate-image')).toBe(true);
        });

        test("uses specified model", async () => {
            const data: Describable = {title: "Test", description: "A scene"};
            const workflow = illustrationWorkflow({ai: dumbAi});
            const result = await workflow({data, imageModel: '@cf/bytedance/stable-diffusion-xl-lightning', path: '/content/123/art'}, new InMemoryStep());

            expect(result.contentType).toBe("image/jpeg");
        });

        test("throws when image generation fails", async () => {
            const badAi: TalebraryAi = {
                generateText: async () => ({}) as any,
                generateImage: async () => { throw new Error("quota exceeded"); },
            };
            const data: Describable = {title: "Test", description: "A scene"};
            const workflow = illustrationWorkflow({ai: badAi});

            expect(workflow({data, path: '/content/123/art'}, new InMemoryStep()))
                .rejects.toThrow("quota exceeded");
        });
    });
});
