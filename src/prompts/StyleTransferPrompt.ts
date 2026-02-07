import type {Describable} from "../types.ts";

export function styleTransferPrompt(story: Describable): string {
    return `Reimagine as a graphic novel cover illustration. Bold linework, rich colors, detailed hand-drawn style. Preserve the composition and subject matter. Cover art for "${story.title}"${story.description ? ` — ${story.description}` : ''}.`;
}
