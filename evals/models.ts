export const textModels = {
    reference: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    candidates: [
        '@cf/ibm-granite/granite-4.0-h-micro',
        '@hf/nousresearch/hermes-2-pro-mistral-7b',
        '@cf/qwen/qwen3-30b-a3b-fp8',
    ],
} as const;

export const imageModels = {
    reference: '@cf/bytedance/stable-diffusion-xl-lightning',
    candidates: [
        '@cf/leonardo/lucid-origin',
        '@cf/black-forest-labs/flux-1-schnell',
        '@cf/leonardo/phoenix-1.0',
        '@cf/black-forest-labs/flux-2-klein-9b',
    ],
} as const;

export const img2imgModels = {
    reference: '@cf/runwayml/stable-diffusion-v1-5-img2img',
    candidates: [
        '@cf/black-forest-labs/flux-2-klein-4b',
        '@cf/black-forest-labs/flux-2-klein-9b',
    ],
} as const;

export const judgeModel = '@cf/meta/llama-3.2-11b-vision-instruct';

// Per-model max_tokens limits (Cloudflare-imposed)
export const maxTokens: Record<string, number> = {
    '@hf/nousresearch/hermes-2-pro-mistral-7b': 1024,
    '@cf/qwen/qwen3-30b-a3b-fp8': 4096,
    '@cf/ibm-granite/granite-4.0-h-micro': 4096,
    '@cf/meta/llama-3.3-70b-instruct-fp8-fast': 4096,
};

export function allModels(group: { reference: string; candidates: readonly string[] }): string[] {
    return [group.reference, ...group.candidates];
}
