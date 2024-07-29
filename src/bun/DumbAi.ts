import {
    always,
    commands,
    directions,
    peopleCommands,
    type ScopedPrompt,
    type TextGenerationPrompt,
    type UnscopedPrompt
} from "../types.ts";
import type {Suggestions} from "../prompts/ActionsPrompt.ts";
import {Arrays} from "../system/Arrays.ts";
import type {AiTextGenerationOutput} from "@cloudflare/workers-types";
import {words} from "../system/Strings.ts";

export class DumbAi {
    run(model: "@cf/meta/llama-3-8b-instruct-awq", prompt: ScopedPrompt): Promise<AiTextGenerationOutput | undefined>;
    run(model: "@cf/bytedance/stable-diffusion-xl-lightning", prompt: UnscopedPrompt): Promise<Uint8Array>;
    async run(model: any, prompt: TextGenerationPrompt): Promise<any> {
        console.log('DumbAi.run', model, 'with prompt', prompt);
        switch (model) {
            case "@cf/bytedance/stable-diffusion-xl-lightning":
                return new Uint8Array(0);
            case "@cf/meta/llama-3-8b-instruct-awq":
                return {response: JSON.stringify(this.instructions(prompt as ScopedPrompt))};
            case "@cf/meta/llama-3.1-8b-instruct":
                return {response: JSON.stringify(this.instructions(prompt as ScopedPrompt))};
            default:
                throw new Error(`Model ${model} not found`);
        }
    }

    private instructions(prompt: ScopedPrompt) {
        const system = prompt.messages.find(m => m.role === 'system');
        const user = prompt.messages.find(m => m.role === 'user');
        if (system?.content.includes('commands list:')) {
            const foundWords = words(user?.content);
            const people = foundWords.some(w => peopleWords.has(w));
            const dir = foundWords.filter(w => directionWords.has(w));
            const mentioned = foundWords.filter(w => commandWords.has(w));
            return {
                actions: [],
                nouns: [],
                people: people,
                commands: Arrays.unique(Arrays.shuffle([
                    ...always,
                    ...dir,
                    ...(people ? peopleCommands : []),
                    ...(dir.length ? directions : []),
                    ...mentioned,
                ])),
            } satisfies Suggestions;
        }
        return 'Unsupported prompt';

    }
}

const peopleWords = new Set(['he', 'she', 'they', 'them', 'it', 'him', 'her', 'his', 'hers', 'their', 'theirs']);
const directionWords = new Set(directions);
const commandWords = new Set(commands);
