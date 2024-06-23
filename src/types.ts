export type SupportedGameType =
    'zcode'
    | 'blorb/zcode'
    | 'glulx'
    | 'blorb/glulx'
    | 'hugo'
    | 'adrift'
    | 'tads2'
    | 'tads3';

export interface Describable {
    title: string;
    description: string;
}

export function isDescribable(value: any): value is Describable {
    return value && typeof value === 'object' &&
        'title' in value && typeof value.title === 'string' &&
        'description' in value && typeof value.description === 'string';
}

export interface SceneContext {
    story: Describable,
    scene: Describable,
    previous?: Describable
}

export const commonCommands = ["about", "again", "all", "ask", "break", "burn", "climb", "curse", "dig", "down", "drink", "drop",
    "east", "eat", "enter", "examine", "examine", "feel", "fill", "give", "go", "help", "in", "info", "inventory",
    "jump", "listen", "look", "north", "off", "on", "open", "out", "pray", "pull", "push", "put", "restore", "save",
    "search", "show", "sing", "sleep", "smell", "south", "take", "talk", "tell", "throw", "to", "turn", "turn",
    "under", "undo", "unlock", "up", "wait", "wake", "wave", "wear", "west", "with"];


export interface Suggestions {
    actions: string[];
    commands: string[];
    nouns: string[];
}

export interface ScopedMessage {
    role: string;
    content: string;
}

export interface PromptProperties {
    /** default: false */
    stream?: boolean;

    /** default: 256, type: integer */
    max_tokens?: number;

    /** min: 0, max: 5, type: number */
    temperature?: number;

    /** min: 0, max: 2, type: number */
    top_p?: number;

    /** min: 1, max: 50, type: integer */
    top_k?: number;

    /** min: 1, max: 9999999999, type: integer */
    seed?: number;

    /** min: 0, max: 2, type: number */
    repetition_penalty?: number;

    /** min: 0, max: 2, type: number */
    frequency_penalty?: number;

    /** min: 0, max: 2, type: number */
    presence_penalty?: number;
}

export interface UnscopedPrompt extends PromptProperties {
    prompt: string;
    raw?: boolean;
}

export interface ScopedPrompt extends PromptProperties {
    messages: ScopedMessage[];
}

export type TextGenerationPrompt = UnscopedPrompt | ScopedPrompt;