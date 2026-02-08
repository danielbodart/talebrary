import {describe, expect, test} from "bun:test";
import {IllustrationHandler} from "../../src/content/IllustrationHandler.ts";
import {DumbAi} from "../../src/bun/DumbAi.ts";
import type {Describable} from "../../src/types.ts";
import {exampleRequest} from "../../src/prompts/GenerateIllustrationPrompt.ts";
import type {TalebraryAi} from "../../src/ai/TalebraryAi.ts";

describe("IllustrationHandler", () => {
    const ai = new DumbAi();
    const handler = new IllustrationHandler({ai});

    function requestWithPrompt(data: object, model?: string): Request {
        const prompt = encodeURIComponent(JSON.stringify(data));
        const modelParam = model ? `&model=${model}` : '';
        return new Request(`http://test/content/123/art?prompt=${prompt}${modelParam}`);
    }

    test("returns 404 when no prompt parameter", async () => {
        const response = await handler.handle(new Request("http://test/content/123/art"));
        expect(response.status).toBe(404);
    });

    describe("llama+stable-diffusion model (default)", () => {
        test("returns image response for valid scene context", async () => {
            const response = await handler.handle(requestWithPrompt(exampleRequest));
            expect(response.headers.get("content-type")).toBe("image/jpeg");
        });

        test("includes description header from generated prompt", async () => {
            const response = await handler.handle(requestWithPrompt(exampleRequest));
            const description = response.headers.get("description");
            expect(description).toBeString();
            expect(description!.length).toBeGreaterThan(0);
        });
    });

    describe("error handling", () => {
        test("returns error when AI throws on text generation", async () => {
            const badAi: TalebraryAi = {
                generateText: async () => { throw new Error("not valid json"); },
                generateImage: async () => new Uint8Array(0),
            };
            const badHandler = new IllustrationHandler({ai: badAi});
            const response = await badHandler.handle(requestWithPrompt(exampleRequest));
            expect(response.status).toBe(500);
        });

        test("returns error when AI throws on image generation", async () => {
            const badImageAi: TalebraryAi = {
                generateText: async () => ({prompt: "a test prompt"}) as any,
                generateImage: async () => { throw new Error("model unavailable"); },
            };
            const badHandler = new IllustrationHandler({ai: badImageAi});
            const response = await badHandler.handle(requestWithPrompt(exampleRequest));
            expect(response.status).toBe(500);
            const body = await response.json();
            expect(body.reason).toContain("model unavailable");
        });

        test("returns error when AI throws on direct model image generation", async () => {
            const badImageAi: TalebraryAi = {
                generateText: async () => ({}) as any,
                generateImage: async () => { throw new Error("quota exceeded"); },
            };
            const badHandler = new IllustrationHandler({ai: badImageAi});
            const data: Describable = {title: "Test", description: "A scene"};
            const response = await badHandler.handle(requestWithPrompt(data, "@cf/bytedance/stable-diffusion-xl-lightning"));
            expect(response.status).toBe(500);
            const body = await response.json();
            expect(body.reason).toContain("quota exceeded");
        });

        test("returns 400 for invalid JSON prompt", async () => {
            const response = await handler.handle(new Request("http://test/content/123/art?prompt=not-json"));
            expect(response.status).toBe(400);
        });

        test("falls back to book cover when AI returns 404 scene-not-found", async () => {
            const noSceneAi: TalebraryAi = {
                generateText: async () => ({status: 404, statusText: "No Scene Found", reason: "Not visual"}) as any,
                generateImage: async () => new Uint8Array(0),
            };
            const handler = new IllustrationHandler({ai: noSceneAi});
            const response = await handler.handle(requestWithPrompt(exampleRequest));
            expect(response.status).toBe(200);
            expect(response.headers.get("content-type")).toBe("image/jpeg");
            expect(response.headers.get("description")).toContain(exampleRequest.story.title);
        });
    });

    describe("direct model mode", () => {
        test("passes prompt directly to specified model", async () => {
            const data: Describable = {title: "Adventure", description: "A great story"};
            const response = await handler.handle(requestWithPrompt(data, "@cf/bytedance/stable-diffusion-xl-lightning"));
            expect(response.headers.get("content-type")).toBe("image/jpeg");
        });
    });
});
