import type {ScopedPrompt} from "../types.ts";

export interface ImagePrompt {
    prompt: string;
    num_steps?: number;
    sourceImage?: string; // base64 encoded source image for img2img
}

export interface TalebraryAi {
    generateText<T = any>(model: string, prompt: ScopedPrompt): Promise<T>;
    generateImage(model: string, input: ImagePrompt): Promise<Uint8Array>;
}
