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

    test.skip("Can generate an image from a prompt", async () => {
        const image = await sd.run({prompt: 'Helicarrier Aircraft carrier flying in the sky, held up by four downward-facing turbo-propellors in round fan housings in each corner, carrying a squadron of fighter jets on its deck', model: "sd3-large", output_format: "png"});
        const bytes = await Bun.write('helicarrier.png', image);
        expect(bytes).toBeGreaterThan(0)
    });

    test.skip("Can generate an image from a prompt", async () => {
        const image = await sd.run({prompt: 'A colossal robot standing as the protector of a glorious city, with citizens bustling around and commuting to work, done in dieselpunk style', model: "sd3-large", output_format: "png"});
        const bytes = await Bun.write('robot.png', image);
        expect(bytes).toBeGreaterThan(0)
    });

    test.skip("Can generate an image from a prompt", async () => {
        const image = await sd.run({prompt: 'A young teenage boy, wearing a modern Yankees-style baseball uniform with hat and mitt, stands in the bustling center of a medieval court with citizens and knights in armor', model: "sd3-large", output_format: "png"});
        const bytes = await Bun.write('baseball.png', image);
        expect(bytes).toBeGreaterThan(0)
    });

    test.skip("Can generate an image from a prompt", async () => {
        const image = await sd.run({prompt: 'Create an image that represents the movie "Back to the Future", include themes of the 1950s, the DeLorean time machine car, and the boy with a skateboard', model: "sd3-large", output_format: "png"});
        const bytes = await Bun.write('back-to-the-future.png', image);
        expect(bytes).toBeGreaterThan(0)
    });

    test.skip("Can generate an image from a prompt", async () => {
        const image = await sd.run({prompt: 'Tomorrow belongs to those who embrace it today', model: "sd3-large", output_format: "png"});
        const bytes = await Bun.write('zdnet.png', image);
        expect(bytes).toBeGreaterThan(0)
    });
});
