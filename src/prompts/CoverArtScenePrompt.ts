import type {Describable, ScopedPrompt} from "../types.ts";

const exampleRequest: Describable = {
    title: "Wishbringer",
    description: "The magick stone of dreams is missing, and the evil tyrant Crisp has plunged the village of Festeron into darkness. Your postal delivery takes a sinister turn.",
};

const exampleResponse = {
    prompt: "Small village shrouded in unnatural darkness. A postal carrier clutches a mysterious glowing stone. Cobblestone streets, shuttered shopfronts, ominous sky.",
};

export function coverArtScenePrompt(story: Describable): ScopedPrompt {
    const systemPrompt = `You are an interactive fiction cover art API. Given a story title and description, extract a visual scene description.

Your task:

1. Read the story description and identify any visual elements — places, objects, characters, or settings that could be illustrated.
2. If the description contains visual imagery (even implied), extract it into a concise scene description. Be generous — a "white house" or "dark cave" or "strange island" is enough to work with. Lean towards generating a prompt rather than rejecting.
3. Only return a 404 if the description is purely abstract with no visual elements at all (e.g. "A text-only simulation game" with no concrete imagery).
4. Describe only the scene — subjects, setting, mood. Do NOT include style instructions (e.g. "graphic novel", "bold linework") — those are added separately.
5. Be terse and focused on key visual elements.
6. Return JSON: {prompt: "scene description"} or {status: 404, statusText: "No Scene Found", reason: "why"}

Example
    Request: ${JSON.stringify(exampleRequest)}
    Response: ${JSON.stringify(exampleResponse)}

Return only the JSON object, no extra text.`;

    return {
        messages: [
            {role: 'system', content: systemPrompt},
            {role: 'user', content: JSON.stringify(story)},
        ],
    };
}
