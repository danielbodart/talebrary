import {
    always,
    commands,
    directions,
    peopleCommands,
    type ScopedPrompt,
    type TextGenerationPrompt,
    type UnscopedPrompt
} from "../types.ts";
import type {Suggestions} from "../prompts/SuggestionsPrompt.ts";
import {Arrays} from "../system/Arrays.ts";
import type {AiTextGenerationOutput} from "@cloudflare/workers-types";
import {words} from "../system/Strings.ts";

export class DumbAi {
    run(model: "@cf/meta/llama-3-8b-instruct-awq", prompt: ScopedPrompt): Promise<AiTextGenerationOutput | undefined>;
    run(model: "@cf/bytedance/stable-diffusion-xl-lightning", prompt: UnscopedPrompt): Promise<Uint8Array>;
    async run(model: any, prompt: TextGenerationPrompt): Promise<any> {
        switch (model) {
            case "@cf/bytedance/stable-diffusion-xl-lightning":
                return new Uint8Array(0);
            case "@cf/black-forest-labs/flux-1-schnell":
                return {image: ""};
            case "@cf/meta/llama-3-8b-instruct-awq":
            case "@cf/meta/llama-3.1-8b-instruct":
            case "@cf/meta/llama-3.2-3b-instruct":
            case "@cf/meta/llama-3.3-70b-instruct-fp8-fast":
                return {response: JSON.stringify(this.textGeneration(prompt as ScopedPrompt))};
            default:
                throw new Error(`Model ${model} not found`);
        }
    }

    private textGeneration(prompt: ScopedPrompt): object | string {
        const system = prompt.messages.find(m => m.role === 'system');
        const user = prompt.messages.find(m => m.role === 'user');
        if (system?.content.includes('commands list:')) {
            return this.suggestions(user?.content);
        }
        if (system?.content.includes('stable diffusion')) {
            return this.illustrationPrompt(user?.content);
        }
        return 'Unsupported prompt';
    }

    private suggestions(userContent: string | undefined): Suggestions {
        const foundWords = words(userContent);
        const people = foundWords.some(w => peopleWords.has(w.toLowerCase()));
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

    private illustrationPrompt(userContent: string | undefined): object {
        if (!userContent) return {status: 404, statusText: "No Scene Found", reason: "No input provided"};
        try {
            const data = JSON.parse(userContent);
            if (data.scene) {
                return {prompt: `Illustration: ${data.scene.title}. ${data.scene.description}. Style: fantasy illustration.`};
            }
            if (data.title) {
                return {prompt: `Illustration: ${data.title}. ${data.description ?? ''}. Style: fantasy illustration.`};
            }
            return {status: 404, statusText: "No Scene Found", reason: "No scene or title in input"};
        } catch {
            return {status: 500, statusText: "Parse Error", reason: "Could not parse input"};
        }
    }
}

const peopleWords = new Set(['he', 'she', 'they', 'them', 'it', 'him', 'her', 'his', 'hers', 'their', 'theirs']);
const directionWords = new Set(directions);
const commandWords = new Set(commands);
