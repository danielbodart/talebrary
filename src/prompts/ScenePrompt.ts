import type {SceneContext} from "../types.ts";

export function scenePrompt(data: SceneContext) {
    return `Create an illustration for a scene called "${data.scene.title}" and described as 
            "${data.scene.description.replace('"', '`')}"
            The scene is part of the interactive fiction called "${data.story.title}" 
            "${data.story.description ? `and described as "${data.story.description}".` : ''}
            ${data.previous ? `The scene should be consistent with the previous scene, which was called "${data.previous.title}" 
            and described as "${data.previous.description.replace('"', '`')}"` : ''}`;
}