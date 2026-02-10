import {describe, expect, test} from "bun:test";
import {CloudflareRestAi} from "../../src/bun/CloudflareRestAi.ts";

describe("CloudflareRestAi", () => {
    test("sends correct request for text generation models", async () => {
        const expectedResult = {response: '{"prompt":"a cat"}'};
        const ai = new CloudflareRestAi("test-account", "test-token", async (request) => {
            expect(new URL(request.url).pathname).toBe("/client/v4/accounts/test-account/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast");
            expect(request.headers.get('Authorization')).toBe("Bearer test-token");
            return new Response(JSON.stringify({result: expectedResult}), {
                headers: {"content-type": "application/json"},
            });
        });

        const result = await ai.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
            messages: [{role: "user", content: "hello"}]
        });
        expect(result).toEqual(expectedResult);
    });

    test("returns Uint8Array for image content types", async () => {
        const imageBytes = new Uint8Array([0xFF, 0xD8, 0xFF]);
        const ai = new CloudflareRestAi("test-account", "test-token", async () =>
            new Response(imageBytes, {headers: {"content-type": "image/jpeg"}}));

        const result = await ai.run("@cf/bytedance/stable-diffusion-xl-lightning", {prompt: "a cat"});
        expect(result).toBeInstanceOf(Uint8Array);
        expect(result).toEqual(imageBytes);
    });

    test("decodes base64 image JSON responses to Uint8Array", async () => {
        const imageBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]);
        const base64 = Buffer.from(imageBytes).toString("base64");
        const ai = new CloudflareRestAi("test-account", "test-token", async () =>
            new Response(JSON.stringify({result: {image: base64}}), {
                headers: {"content-type": "application/json"},
            }));

        const result = await ai.run("@cf/leonardo/lucid-origin", {prompt: "a cat"});
        expect(result).toBeInstanceOf(Uint8Array);
        expect(result).toEqual(imageBytes);
    });

    test("sends multipart for flux-2-klein when multipart wrapper provided", async () => {
        const responseImage = new Uint8Array([0x89, 0x50, 0x4E, 0x47]);
        const responseBase64 = Buffer.from(responseImage).toString("base64");

        const ai = new CloudflareRestAi("test-account", "test-token", async (request) => {
            expect(request.headers.get('Content-Type')).toContain("multipart/form-data");
            expect(request.headers.get('Content-Type')).toContain("boundary=");

            const receivedForm = await request.formData();
            expect(receivedForm.get("prompt")).toBe("a cat in a hat");

            return new Response(JSON.stringify({result: {image: responseBase64}}), {
                headers: {"content-type": "application/json"},
            });
        });

        const result = await ai.run("@cf/black-forest-labs/flux-2-klein-9b", {
            prompt: "a cat in a hat",
            num_steps: 4,
            multipart: {body: "ignored", contentType: "ignored"},
        });
        expect(result).toBeInstanceOf(Uint8Array);
        expect(result).toEqual(responseImage);
    });

    test("sends multipart for flux-2-klein text-to-image without sourceImage", async () => {
        const responseImage = new Uint8Array([0x89, 0x50, 0x4E, 0x47]);
        const responseBase64 = Buffer.from(responseImage).toString("base64");

        const ai = new CloudflareRestAi("test-account", "test-token", async (request) => {
            expect(request.headers.get('Content-Type')).toContain("multipart/form-data");

            const receivedForm = await request.formData();
            expect(receivedForm.get("prompt")).toBe("a sunset");
            expect(receivedForm.get("num_steps")).toBe("4");
            expect(receivedForm.has("input_image_0")).toBe(false);

            return new Response(JSON.stringify({result: {image: responseBase64}}), {
                headers: {"content-type": "application/json"},
            });
        });

        const result = await ai.run("@cf/black-forest-labs/flux-2-klein-9b", {
            prompt: "a sunset",
            num_steps: 4,
            multipart: {body: "ignored", contentType: "ignored"},
        });
        expect(result).toBeInstanceOf(Uint8Array);
        expect(result).toEqual(responseImage);
    });

    test("sends JSON with image_b64 for non-flux img2img models with sourceImage", async () => {
        const imageBytes = new Uint8Array([0xFF, 0xD8, 0xFF]);
        const sourceBase64 = Buffer.from(new Uint8Array([1, 2, 3])).toString("base64");

        const ai = new CloudflareRestAi("test-account", "test-token", async (request) => {
            expect(request.headers.get('Content-Type')).toBe("application/json");

            const body = await request.json() as any;
            expect(body.prompt).toBe("a cat");
            expect(body.image_b64).toBe(sourceBase64);
            expect(body.sourceImage).toBeUndefined();
            expect(body.multipart).toBeUndefined();

            return new Response(imageBytes, {headers: {"content-type": "image/jpeg"}});
        });

        const result = await ai.run("@cf/runwayml/stable-diffusion-v1-5-img2img", {
            prompt: "a cat",
            sourceImage: sourceBase64,
            multipart: {body: "ignored", contentType: "ignored"},
        });
        expect(result).toBeInstanceOf(Uint8Array);
        expect(result).toEqual(imageBytes);
    });

    test("falls back to JSON for non-flux-2-klein models even with multipart wrapper", async () => {
        const imageBytes = new Uint8Array([0xFF, 0xD8, 0xFF]);

        const ai = new CloudflareRestAi("test-account", "test-token", async (request) => {
            expect(request.headers.get('Content-Type')).toBe("application/json");
            const body = await request.json() as any;
            expect(body.prompt).toBe("a cat");
            expect(body.multipart).toBeUndefined();

            return new Response(imageBytes, {headers: {"content-type": "image/jpeg"}});
        });

        const result = await ai.run("@cf/bytedance/stable-diffusion-xl-lightning", {
            prompt: "a cat",
            multipart: {body: "ignored", contentType: "ignored"},
        });
        expect(result).toBeInstanceOf(Uint8Array);
        expect(result).toEqual(imageBytes);
    });

    test("unwraps chat completion response from result.response", async () => {
        const chatCompletion = {
            object: "chat.completion",
            choices: [{index: 0, message: {role: "assistant", content: "hello world"}, finish_reason: "stop"}],
        };
        const ai = new CloudflareRestAi("test-account", "test-token", async () =>
            new Response(JSON.stringify({result: {response: chatCompletion}}), {
                headers: {"content-type": "application/json"},
            }));

        const result = await ai.run("@cf/ibm-granite/granite-4.0-h-micro", {
            messages: [{role: "user", content: "hello"}]
        });
        expect(result).toEqual(chatCompletion);
        expect(result.choices[0].message.content).toBe("hello world");
    });

    test("throws on API error", async () => {
        const ai = new CloudflareRestAi("test-account", "test-token", async () =>
            new Response("Unauthorized", {status: 401}));

        await expect(ai.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {}))
            .rejects.toThrow("Cloudflare AI API error 401 for @cf/meta/llama-3.3-70b-instruct-fp8-fast: Unauthorized");
    });
});
