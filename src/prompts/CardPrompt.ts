import type {Describable} from "../types.ts";

export function cardPrompt(data: Describable & { rules: string }) {
    return `Create a colourful illustration for a card titled "${data.title}"
            and described as "${data.description}" 
            with a fantasy or sci-fi theme.`;
}