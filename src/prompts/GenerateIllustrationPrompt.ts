import type {SceneContext, ScopedPrompt, UnscopedPrompt} from "../types.ts";

export const exampleRequest: SceneContext = {
    story: {
        title: "Adventure",
        description: `The original 1976 by William Crowther and Donald Woods. Somewhere nearby is Colossal Cave, where
        others have found fortunes in treasures and gold, though it is rumored that some who enter are never seen again.
        Magic is said to work in the cave. `
    },
    scene: {
        title: "At End Of Road",
        description: "You are standing at the end of a road before a small brick building. Around you is a forest. A small stream flows out of the building and down a gully."
    }
}

export const exampleResponse: UnscopedPrompt = {
    prompt: "Illustration: road end, small brick building, dense forest. Stream from building down gully. Graphic novel style, bold linework, rich colours, detailed hand-drawn. Vintage adventure book aesthetic. No border."
}


export function generateIllustrationPrompt(data: SceneContext): ScopedPrompt {
    const systemPrompt = `You are an interactive fiction copilot API. Your job is to process a data object and
    generate a prompt for an image generation model.

    The user input will be in JSON format and will contain a story, a scene and an optional previous scene object. Each object will have a title and a description.

    Your tasks are as follows:

    1. Examine the scene object and determine if it actually describes a scene that would make a good illustration. If not return the reason why you do not think it is a scene in JSON {status: 404, statusText: "No Scene Found", reason: "Some reason why it is not a scene"}
    2. Extract the key concepts from the scene object and use them as the primary components for the prompt.
    2. Next examine the previous scene if present and make sure the current scene is consistent with the previous scene unless it specifically states otherwise.
       Example: if the previous scene was a dark forest, the current scene should not be a bright sunny beach unless explicitly described that way.
       Example: if the previous scene was underground, the current scene should not be outside unless explicitly described that way.
    3. Next look at the story object and make sure the scene is consistent with the story. The story can be especially useful for determining the overall tone of the scene.
       Example: if the story is about space travel, and the scene mentions a ship, it is likely a space ship not a boat.
       Example: if the story is about caves, and the scene mentions passages, it is likely an underground passage not back ally.
    4. Follow these image prompt rules:
        a. Be Descriptive, Specific and Explicit
            Clearly describe the subject, setting, and any particular elements you want in the image.
            Be explicit in your prompt so the model focuses on what is important.
            Example: "A serene mountain landscape at sunrise, with a clear sky and vibrant colors reflecting on a calm lake."
        b. Use Clear Language and Grammar
            This helps the model understand and adhere to the prompt better.
            Example: "A woman wearing a red dress standing in a field of sunflowers, under a bright blue sky with fluffy white clouds."
        c. Incorporate Style and Medium
            Specify the artistic style or medium you want the image to emulate. As we are an interactive fiction copilot, the style should be an illustration or graphic novel. Do not request a photograph or realistic painting.
            Example: "A vibrant illustration of a futuristic cityscape at night, with neon lights and flying cars, in the style of cyberpunk art."
        d. Be Terse and Focused
            Keep the prompt focused on what is important. Avoid superfluous words that dilute the key concepts.
        e. No Borders or Frames
            Never include borders, frames, or decorative edges around the image. The illustration should fill the entire canvas edge-to-edge.
    5. Return the prompt in unscoped JSON format: {prompt: "your generated prompt here"}


    Example
        Request: ${JSON.stringify(exampleRequest)}
        Response: ${JSON.stringify(exampleResponse)}


    Do not add extra human readable comments before or after the JSON response. Return only the JSON object.
    `;

    return {
        messages: [
            {role: 'system', content: systemPrompt},
            {role: 'user', content: JSON.stringify(data)},
        ],
    }
}
