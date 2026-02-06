export type SupportedGameType =
    'zcode'
    | 'blorb/zcode'
    | 'glulx'
    | 'blorb/glulx'
    | 'hugo'
    | 'adrift'
    | 'alan2'
    | 'alan3'
    | 'agt'
    | 'advsys'
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

// https://pr-if.org/doc/play-if-card/play-if-card.html

export const always = ["look", "examine", "inventory"];

export const peopleCommands = ["ask", "give", "talk", "tell", "show"];

export const directions = ["north", "east", "south", "west", "up", "down", "in", "out", "go"]

export const common = ["take", "drop", "open", "put", "pull", "push", "turn", "feel"];

export const extra = [
    "eat", "drink", "climb", "wave", "fill", "wear", "smell", "off", "on", "listen", "turn", "dig", "burn", "enter", "look", "under", "search", "unlock", "with", "break",
    "jump", "sleep", "pray", "wake", "curse", "sing", "undo", "throw"
]

export const controls = ["about", "info", "help", "again", "restore", "save", "quit"];

export const commands = [...peopleCommands, ...directions, ...always, ...common, ...controls, ...extra];


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

export interface FluxRequest {
    prompt: string;
    num_steps: number; // default: 4, max: 8, type: integer
}

export interface FluxResponse {
    image: string; // base64 encoded image
}