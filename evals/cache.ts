import type {TalebraryAi, ImagePrompt} from "../src/ai/TalebraryAi.ts";
import type {ScopedPrompt} from "../src/types.ts";
import {md5} from "../src/bun/digest.ts";
import {file} from "bun";
import {mkdir} from "node:fs/promises";

const CACHE_DIR = "evals/results/cache";

async function hash(value: string): Promise<string> {
    return md5(new TextEncoder().encode(value).buffer as ArrayBuffer);
}

function sanitiseModel(model: string): string {
    return model.replaceAll("/", "_").replaceAll("@", "");
}

function imageExtension(bytes: Uint8Array): string {
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return "jpg";
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return "png";
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) return "webp";
    return "bin";
}

const imageExtensions = ["jpg", "png", "webp", "bin"];

export class CachedAi implements TalebraryAi {
    constructor(private ai: TalebraryAi) {
    }

    async generateText<T = any>(model: string, prompt: ScopedPrompt): Promise<T> {
        const inputKey = await hash(JSON.stringify(prompt));
        const modelDir = `${CACHE_DIR}/${sanitiseModel(model)}`;
        const jsonPath = `${modelDir}/${inputKey}.json`;

        const jsonFile = file(jsonPath);
        if (await jsonFile.exists()) {
            return JSON.parse(await jsonFile.text());
        }

        const output = await this.ai.generateText<T>(model, prompt);

        await mkdir(modelDir, {recursive: true});
        await Bun.write(jsonPath, JSON.stringify(output, null, 2));

        return output;
    }

    async generateImage(model: string, input: ImagePrompt): Promise<Uint8Array> {
        const inputKey = await hash(JSON.stringify(input));
        const modelDir = `${CACHE_DIR}/${sanitiseModel(model)}`;

        for (const ext of imageExtensions) {
            const imgPath = `${modelDir}/${inputKey}.${ext}`;
            const imgFile = file(imgPath);
            if (await imgFile.exists()) {
                return new Uint8Array(await imgFile.arrayBuffer());
            }
        }

        const output = await this.ai.generateImage(model, input);

        await mkdir(modelDir, {recursive: true});
        const ext = imageExtension(output);
        const imgPath = `${modelDir}/${inputKey}.${ext}`;
        await Bun.write(imgPath, output);

        return output;
    }

    async imagePathFor(model: string, input: ImagePrompt, bytes: Uint8Array): Promise<string> {
        const inputKey = await hash(JSON.stringify(input));
        return `${sanitiseModel(model)}/${inputKey}.${imageExtension(bytes)}`;
    }
}
