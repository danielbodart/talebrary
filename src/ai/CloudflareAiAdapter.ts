import type {ScopedPrompt} from "../types.ts";
import type {ImagePrompt, TalebraryAi} from "./TalebraryAi.ts";

interface CloudflareAi {
    run(model: string, input: any): Promise<any>;
}

export class CloudflareAiAdapter implements TalebraryAi {
    constructor(private ai: CloudflareAi) {
    }

    async generateText<T = any>(model: string, prompt: ScopedPrompt): Promise<T> {
        const result = await this.ai.run(model, prompt);
        return parseTextResponse<T>(result);
    }

    async generateImage(model: string, input: ImagePrompt): Promise<Uint8Array> {
        const cloudflareInput = toCloudflareImageInput(model, input);
        const result = await this.ai.run(model, cloudflareInput);
        return normalizeImageResponse(result);
    }
}

function parseTextResponse<T>(result: any): T {
    // OpenAI-compatible format: {choices: [{message: {content: "json"}}]}
    if (Array.isArray(result?.choices)) {
        const content = result.choices[0]?.message?.content?.trim();
        if (typeof content === 'string') return JSON.parse(content);
    }
    // Workers AI format: {response: string | object}
    const response = result?.response;
    if (typeof response === 'string') return JSON.parse(response);
    if (typeof response === 'object' && response !== null) return response as T;
    throw new Error(`AI response has no response field: ${JSON.stringify(result)}`);
}

async function normalizeImageResponse(result: any): Promise<Uint8Array> {
    if (result instanceof Uint8Array) return result;
    if (result instanceof ReadableStream) return new Uint8Array(await new Response(result).arrayBuffer());
    if (result?.image && typeof result.image === 'string') {
        return Uint8Array.from(atob(result.image), c => c.charCodeAt(0));
    }
    throw new Error(`Unexpected image response format: ${JSON.stringify(result)?.slice(0, 100)}`);
}

function detectImageType(bytes: Uint8Array): string {
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return 'image/jpeg';
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return 'image/png';
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) return 'image/webp';
    return 'image/png';
}

function toCloudflareImageInput(model: string, input: ImagePrompt): any {
    // Only flux-2-klein requires multipart FormData; all other models use plain JSON.
    if (!model.includes('flux-2-klein')) return input;

    const form = new FormData();
    form.append('prompt', input.prompt);
    if (input.num_steps) form.append('num_steps', String(input.num_steps));
    if (input.sourceImage) {
        const bytes = Uint8Array.from(atob(input.sourceImage), c => c.charCodeAt(0));
        form.append('input_image_0', new Blob([bytes], {type: detectImageType(bytes)}));
    }

    // Serialize FormData via Response to get a ReadableStream body + content-type with boundary.
    // The env.AI binding requires a stream (not raw FormData) — passing FormData directly fails with 3043.
    // Do NOT include extra fields alongside multipart — the native binding rejects them (HTTP 414).
    // IMPORTANT: Read content-type BEFORE accessing .body — Bun clears headers after body access.
    const response = new Response(form);
    const contentType = response.headers.get('content-type');
    return {multipart: {body: response.body, contentType}};
}
