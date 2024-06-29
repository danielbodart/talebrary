import {commonCommands, type ScopedPrompt, type TextGenerationPrompt, type UnscopedPrompt} from "../types.ts";
import type {SuggestionedActions} from "../content/Prompts.ts";
import {Arrays} from "../system/Arrays.ts";

export class DumbAi {
    run(model: "@cf/meta/llama-3-8b-instruct-awq", prompt: ScopedPrompt): Promise<Uint8Array>;
    run(model: "@cf/bytedance/stable-diffusion-xl-lightning", prompt: UnscopedPrompt): Promise<Uint8Array>;
    async run(model: any, _prompt: TextGenerationPrompt): Promise<any> {
        switch (model) {
            case "@cf/bytedance/stable-diffusion-xl-lightning":
                return new Uint8Array(0);
            case "@cf/meta/llama-3-8b-instruct-awq":
                return {response: JSON.stringify({actions: [], commands: Arrays.shuffle(commonCommands), nouns: []} satisfies SuggestionedActions)}
            default:
                throw new Error(`Model ${model} not found`);
        }
    }
}

