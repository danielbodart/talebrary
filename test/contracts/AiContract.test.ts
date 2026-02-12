import {describe, expect, test} from "bun:test";
import {DumbAi} from "../../src/bun/DumbAi.ts";
import {CloudflareRestAi} from "../../src/bun/CloudflareRestAi.ts";
import {CloudflareAiAdapter} from "../../src/ai/CloudflareAiAdapter.ts";
import {suggestionsTreePrompt, ExampleInput} from "../../src/prompts/SuggestionsTreePrompt.ts";
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
                const result = await ai.generateText("@cf/meta/llama-3.3-70b-instruct-fp8-fast", suggestionsTreePrompt(ExampleInput));
                expect(result).toHaveProperty("people");
                expect(result).toHaveProperty("tree");
                expect(typeof result.tree).toBe("object");
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

            test("leonardo phoenix: returns Uint8Array", async () => {
                const ai = createAi();
                const result = await ai.generateImage("@cf/leonardo/phoenix-1.0", {prompt: "a cat"});
                expect(result).toBeInstanceOf(Uint8Array);
            });

            test("flux-2-klein: returns Uint8Array (multipart text-to-image)", async () => {
                const ai = createAi();
                const result = await ai.generateImage("@cf/black-forest-labs/flux-2-klein-9b", {prompt: "a cat", num_steps: 4});
                expect(result).toBeInstanceOf(Uint8Array);
            });

            test("flux-2-klein: returns Uint8Array (multipart img2img with sourceImage)", async () => {
                const ai = createAi();
                const sourceImage = btoa(String.fromCharCode(...new Uint8Array([1, 2, 3, 4])));
                const result = await ai.generateImage("@cf/black-forest-labs/flux-2-klein-9b", {
                    prompt: "graphic novel style",
                    sourceImage,
                    num_steps: 4,
                });
                expect(result).toBeInstanceOf(Uint8Array);
            });
        });
    });
}

// DumbAi - the in-memory test double
aiContractTests("DumbAi", () => new DumbAi());

// CloudflareAiAdapter wrapping a native-like binding that returns ReadableStream for images
aiContractTests("CloudflareAiAdapter (native binding)", () => {
    const cannedSuggestionsResponse = {
        people: false,
        tree: {examine: ["cave"], look: [], go: ["north"]},
    };
    const cannedIllustrationResponse = {
        prompt: "Dark cave entrance, dripping water. Style: fantasy illustration."
    };

    const nativeBinding = {
        async run(model: string, input: any): Promise<any> {
            const isImageModel = model.includes('stable-diffusion') || model.includes('flux') || model.includes('leonardo');
            if (isImageModel) {
                if (input.multipart) {
                    // flux-2-klein: multipart serialized via Response — body is ReadableStream,
                    // contentType includes boundary (e.g. "multipart/form-data; boundary=...")
                    if (!(input.multipart.body instanceof ReadableStream)) throw new Error('multipart.body must be a ReadableStream');
                    if (!input.multipart.contentType?.startsWith('multipart/form-data')) throw new Error('multipart.contentType must start with "multipart/form-data"');
                } else {
                    if (!input.prompt) throw new Error('prompt is required');
                }
                const bytes = new Uint8Array([0xFF, 0xD8, 0xFF]);
                return new ReadableStream({
                    start(controller) {
                        controller.enqueue(bytes);
                        controller.close();
                    }
                });
            }
            const isIllustration = input.messages?.some((m: any) => m.content?.includes('image generation model'));
            return {response: JSON.stringify(isIllustration ? cannedIllustrationResponse : cannedSuggestionsResponse)};
        }
    };

    return new CloudflareAiAdapter(nativeBinding);
});

// CloudflareAiAdapter wrapping CloudflareRestAi with canned HTTP responses
aiContractTests("CloudflareAiAdapter", () => {
    const cannedSuggestionsResponse = {
        people: false,
        tree: {
            examine: ["cave"],
            look: [],
            go: ["north"],
        },
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

        if (model === "@cf/leonardo/phoenix-1.0") {
            return new Response(new Uint8Array([0xFF, 0xD8, 0xFF]), {
                headers: {"content-type": "image/jpeg"},
            });
        }

        if (model?.includes("flux-2-klein")) {
            const responseBase64 = Buffer.from(new Uint8Array([0x89, 0x50, 0x4E, 0x47])).toString("base64");
            return new Response(JSON.stringify({result: {image: responseBase64}}), {
                headers: {"content-type": "application/json"},
            });
        }

        // Text generation: detect suggestion vs illustration by checking prompt content
        const contentType = request.headers.get('content-type') ?? '';
        let isIllustration: boolean;
        if (contentType.includes('application/json')) {
            const body = await request.json() as any;
            isIllustration = body.messages?.some((m: any) => m.content?.includes('image generation model'));
        } else {
            isIllustration = false;
        }
        const responseData = isIllustration ? cannedIllustrationResponse : cannedSuggestionsResponse;

        return new Response(JSON.stringify({result: {response: JSON.stringify(responseData)}}), {
            headers: {"content-type": "application/json"},
        });
    });

    return new CloudflareAiAdapter(restAi);
});
