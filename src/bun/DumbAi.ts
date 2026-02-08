import {
    always,
    commands,
    directions,
    peopleCommands,
    type ScopedPrompt,
} from "../types.ts";
import type {SuggestionTree} from "../prompts/SuggestionsTreePrompt.ts";
import {Arrays} from "../system/Arrays.ts";
import {words} from "../system/Strings.ts";
import type {ImagePrompt, TalebraryAi} from "../ai/TalebraryAi.ts";

export class DumbAi implements TalebraryAi {
    async generateText<T = any>(_model: string, prompt: ScopedPrompt): Promise<T> {
        return this.textGeneration(prompt) as T;
    }

    async generateImage(_model: string, _input: ImagePrompt): Promise<Uint8Array> {
        return new Uint8Array(0);
    }

    private textGeneration(prompt: ScopedPrompt): object | string {
        const system = prompt.messages.find(m => m.role === 'system');
        const user = prompt.messages.find(m => m.role === 'user');
        if (system?.content.includes('command tree')) {
            return this.suggestions(user?.content);
        }
        if (system?.content.includes('stable diffusion')) {
            return this.illustrationPrompt(user?.content);
        }
        return 'Unsupported prompt';
    }

    private suggestions(userContent: string | undefined): SuggestionTree {
        const foundWords = words(userContent);
        const people = foundWords.some(w => peopleWords.has(w.toLowerCase()));
        const dir = foundWords.filter(w => directionWords.has(w));
        const mentioned = foundWords.filter(w => commandWords.has(w));
        const verbs = Arrays.unique(Arrays.shuffle([
            ...always,
            ...(people ? peopleCommands : []),
            ...mentioned,
        ]));
        const tree: Record<string, string[]> = {};
        for (const verb of verbs) tree[verb] = [];
        for (const d of Arrays.unique(dir)) tree[d] = [];
        if (dir.length) tree["go"] = Arrays.unique(dir);
        return {people, tree} satisfies SuggestionTree;
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
