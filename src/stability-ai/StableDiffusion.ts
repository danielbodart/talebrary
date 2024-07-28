import type {Dependency} from "../yadic/mod.ts";
import {type Http, post} from "../http/mod.ts";


export type GenerationMode = 'image-to-image' | 'text-to-image';
export type AspectRatio = '16:9' | '1:1' | '21:9' | '2:3' | '3:2' | '4:5' | '5:4' | '9:16' | '9:21';
export type Model = 'sd3-large' | 'sd3-large-turbo' | 'sd3-medium';
export type OutputFormat = 'jpeg' | 'png' | 'webp';

export interface StableDiffusion3Prompt {
    prompt: string;
    /**
     * default is sd3-large
     */
    model?: Model;
    /**
     * default is text-to-image
     */
    mode?: GenerationMode;
    /**
     * defaults tp 1:1
     */
    aspect_ratio?: AspectRatio;
    /**
     * defaults to 0 (random)
     */
    seed?: number;
    /**
     * defaults to png
     */
    output_format?: OutputFormat;
    /**
     * does not work with sd3-large-turbo
     */
    negative_prompt?: string;
}

// Additional types for specific use cases
export interface TextToImageRequest extends StableDiffusion3Prompt {
    mode: 'text-to-image';
}

export interface ImageToImageRequest extends StableDiffusion3Prompt {
    mode: 'image-to-image';
    // Every side must be at least 64 pixels
    // jpeg png webp
    image: Blob;
    strength: number;
}

export interface StableDiffusionConfig {
    STABLE_DIFFUSION_API_KEY: string;
}

export interface StableDiffusionDependencies extends Dependency<'http', Http>, StableDiffusionConfig {
}

export class StableDiffusion {
    constructor(private deps: StableDiffusionDependencies) {
    }

    async run(prompt: StableDiffusion3Prompt): Promise<ArrayBuffer> {
        const data = Object.entries(prompt).reduce((acc, [key, value]) => {
            acc.append(key, value);
            return acc;
        }, new FormData());

        const request = post('https://api.stability.ai/v2beta/stable-image/generate/sd3', [
            ['authorization', `Bearer ${this.deps.STABLE_DIFFUSION_API_KEY}`],
            ['accept', 'image/*']
        ], data);

        const response = await this.deps.http(request);
        if (response.ok) return await response.arrayBuffer();
        throw new Error(`Failed to generate image: ${response.status} ${response.statusText} ${await response.text()}`);
    }
}