import type {Describable} from "../types.ts";

export function storyPrompt(data: Describable) {
    return `Create the cover art illustration for the interactive fiction called "${data.title}" 
            "${data.description ? `and described as "${data.description}".` : ''}`;
}