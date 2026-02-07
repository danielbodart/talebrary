import {describe, expect, test} from "bun:test";
import {IllustrationHandler} from "../../src/content/IllustrationHandler.ts";
import {DumbAi} from "../../src/bun/DumbAi.ts";
import type {Describable} from "../../src/types.ts";
import {exampleRequest} from "../../src/prompts/GenerateIllustrationPrompt.ts";

describe("IllustrationHandler", () => {
    const ai = new DumbAi();
    const handler = new IllustrationHandler({ai: ai as any});

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
        test("returns error when AI returns invalid JSON for illustration prompt", async () => {
            const badAi = {
                run: async (model: string) => {
                    if (model.includes('llama')) return {response: "not valid json"};
                    return new Uint8Array(0);
                }
            };
            const badHandler = new IllustrationHandler({ai: badAi as any});
            const response = await badHandler.handle(requestWithPrompt(exampleRequest));
            expect(response.status).toBe(500);
        });

        test("returns error status when AI returns 404 scene-not-found", async () => {
            const noSceneAi = {
                run: async (model: string) => {
                    if (model.includes('llama')) {
                        return {response: JSON.stringify({status: 404, statusText: "No Scene Found", reason: "Not visual"})};
                    }
                    return new Uint8Array(0);
                }
            };
            const handler = new IllustrationHandler({ai: noSceneAi as any});
            const response = await handler.handle(requestWithPrompt(exampleRequest));
            expect(response.status).toBe(404);
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
