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

    test("throws on API error", async () => {
        const ai = new CloudflareRestAi("test-account", "test-token", async () =>
            new Response("Unauthorized", {status: 401}));

        await expect(ai.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {}))
            .rejects.toThrow("Cloudflare AI API error 401: Unauthorized");
    });
});
