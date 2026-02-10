import {describe, expect, test} from "bun:test";
import {IllustrationHandler} from "../../src/content/IllustrationHandler.ts";
import {DumbAi} from "../../src/bun/DumbAi.ts";
import {CloudflareAiAdapter} from "../../src/ai/CloudflareAiAdapter.ts";
import type {Describable} from "../../src/types.ts";
import {exampleRequest} from "../../src/prompts/GenerateIllustrationPrompt.ts";
import type {TalebraryAi} from "../../src/ai/TalebraryAi.ts";
import {DirectRunner} from "../../src/workflows/mod.ts";
import {illustrationWorkflow} from "../../src/workflows/illustration.ts";
import {stubBucket} from "../stubBucket.ts";

function makeHandler(ai: TalebraryAi) {
    const bucket = stubBucket();
    return new IllustrationHandler({
        bucket,
        illustrationRunner: new DirectRunner(illustrationWorkflow({ai, bucket})),
    });
}

describe("IllustrationHandler", () => {
    const ai = new DumbAi();
    const handler = makeHandler(ai);

    function requestWithPrompt(data: object, model?: string): Request {
        const prompt = encodeURIComponent(JSON.stringify(data));
        const modelParam = model ? `&model=${model}` : '';
        return new Request(`http://test/content/123/art?prompt=${prompt}${modelParam}`);
    }

    test("returns 404 when no prompt parameter", async () => {
        const response = await handler.handle(new Request("http://test/content/123/art"));
        expect(response.status).toBe(404);
    });

    describe("scene context (llama + image model)", () => {
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

    describe("non-scene data (direct prompt)", () => {
        test("generates image from direct prompt", async () => {
            const data: Describable = {title: "Adventure", description: "A great story"};
            const response = await handler.handle(requestWithPrompt(data));
            expect(response.headers.get("content-type")).toBe("image/jpeg");
        });

        test("uses specified model when provided", async () => {
            const data: Describable = {title: "Test", description: "A scene"};
            const response = await handler.handle(requestWithPrompt(data, "@cf/bytedance/stable-diffusion-xl-lightning"));
            expect(response.headers.get("content-type")).toBe("image/jpeg");
        });
    });

    describe("default model (Leonardo Phoenix) via CloudflareAiAdapter", () => {
        const strictBinding = {
            async run(model: string, input: any): Promise<any> {
                if (model.includes('leonardo')) {
                    if (input.multipart) throw new Error('Leonardo models do not accept multipart input');
                    if (!input.prompt) throw new Error('prompt is required');
                    return new ReadableStream({
                        start(controller) {
                            controller.enqueue(new Uint8Array([0xFF, 0xD8, 0xFF]));
                            controller.close();
                        }
                    });
                }
                // Text generation (llama) - return a valid illustration prompt
                return {response: JSON.stringify({prompt: "A dark barrow interior"})};
            }
        };
        const strictHandler = makeHandler(new CloudflareAiAdapter(strictBinding));

        test("scene context uses default model without multipart", async () => {
            const response = await strictHandler.handle(requestWithPrompt(exampleRequest));
            expect(response.status).toBe(200);
            expect(response.headers.get("content-type")).toBe("image/jpeg");
        });

        test("direct prompt uses default model without multipart", async () => {
            const data: Describable = {title: "Test", description: "A scene"};
            const response = await strictHandler.handle(requestWithPrompt(data));
            expect(response.status).toBe(200);
            expect(response.headers.get("content-type")).toBe("image/jpeg");
        });
    });

    describe("error handling", () => {
        test("returns error when AI throws on text generation", async () => {
            const badAi: TalebraryAi = {
                generateText: async () => { throw new Error("not valid json"); },
                generateImage: async () => new Uint8Array(0),
            };
            const response = await makeHandler(badAi).handle(requestWithPrompt(exampleRequest));
            expect(response.status).toBe(500);
        });

        test("returns error when AI throws on image generation", async () => {
            const badImageAi: TalebraryAi = {
                generateText: async () => ({prompt: "a test prompt"}) as any,
                generateImage: async () => { throw new Error("model unavailable"); },
            };
            const response = await makeHandler(badImageAi).handle(requestWithPrompt(exampleRequest));
            expect(response.status).toBe(500);
            const body = await response.json();
            expect(body.reason).toContain("model unavailable");
        });

        test("returns error when AI throws on direct image generation", async () => {
            const badImageAi: TalebraryAi = {
                generateText: async () => ({}) as any,
                generateImage: async () => { throw new Error("quota exceeded"); },
            };
            const data: Describable = {title: "Test", description: "A scene"};
            const response = await makeHandler(badImageAi).handle(requestWithPrompt(data));
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
            const response = await makeHandler(noSceneAi).handle(requestWithPrompt(exampleRequest));
            expect(response.status).toBe(200);
            expect(response.headers.get("content-type")).toBe("image/jpeg");
            expect(response.headers.get("description")).toContain(exampleRequest.story.title);
        });
    });
});
