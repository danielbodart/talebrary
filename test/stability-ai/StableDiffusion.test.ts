import {describe, expect, test} from "bun:test";
import {StableDiffusion} from "../../src/stability-ai/StableDiffusion.ts";
import {client} from "../../src/http/mod.ts";

const apiKey = process.env.STABLE_DIFFUSION_API_KEY;

describe.if(!!apiKey)("StabilityDiffusion", () => {
    const sd = new StableDiffusion({STABLE_DIFFUSION_API_KEY: String(apiKey), http: client});

    test.skip("Can generate an image from a prompt", async () => {
        const image = await sd.run({prompt: 'A cat in a hat', model: "sd3-medium", output_format: "png"});
        const bytes = await Bun.write('image.png', image);
        expect(bytes).toBeGreaterThan(0)
    });
});
