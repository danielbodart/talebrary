import {CloudflareRestAi} from "../src/bun/CloudflareRestAi.ts";
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

export class CachedAi {
    constructor(private ai: CloudflareRestAi) {
    }

    async run(model: string, input: any): Promise<{ output: any; cached: boolean; cachePath?: string }> {
        const inputKey = await hash(JSON.stringify(input));
        const modelDir = `${CACHE_DIR}/${sanitiseModel(model)}`;
        const jsonPath = `${modelDir}/${inputKey}.json`;

        const jsonFile = file(jsonPath);
        if (await jsonFile.exists()) {
            const parsed = JSON.parse(await jsonFile.text());
            if (parsed?.image && typeof parsed.image === 'string') {
                const bytes = Uint8Array.from(atob(parsed.image), c => c.charCodeAt(0));
                const ext = imageExtension(bytes);
                const imgPath = `${modelDir}/${inputKey}.${ext}`;
                const imgRelPath = `${sanitiseModel(model)}/${inputKey}.${ext}`;
                await Bun.write(imgPath, bytes);
                await jsonFile.delete();
                return {output: bytes, cached: true, cachePath: imgRelPath};
            }
            return {output: parsed, cached: true};
        }

        for (const ext of imageExtensions) {
            const imgPath = `${modelDir}/${inputKey}.${ext}`;
            const imgFile = file(imgPath);
            if (await imgFile.exists()) {
                const imgRelPath = `${sanitiseModel(model)}/${inputKey}.${ext}`;
                return {output: new Uint8Array(await imgFile.arrayBuffer()), cached: true, cachePath: imgRelPath};
            }
        }

        const raw = await this.ai.run(model, input);

        // Normalise base64 image responses (FluxResponse) to Uint8Array
        const output = raw?.image && typeof raw.image === 'string'
            ? Uint8Array.from(atob(raw.image), c => c.charCodeAt(0))
            : raw;

        await mkdir(modelDir, {recursive: true});
        if (output instanceof Uint8Array) {
            const ext = imageExtension(output);
            const imgPath = `${modelDir}/${inputKey}.${ext}`;
            const imgRelPath = `${sanitiseModel(model)}/${inputKey}.${ext}`;
            await Bun.write(imgPath, output);
            return {output, cached: false, cachePath: imgRelPath};
        } else {
            await Bun.write(jsonPath, JSON.stringify(output, null, 2));
        }

        return {output, cached: false};
    }
}
