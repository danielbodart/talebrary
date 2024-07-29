import {cardPrompt} from "./CardPrompt.ts";
import {isDescribable} from "../types.ts";
import {storyPrompt} from "./StoryPrompt.ts";
import {scenePrompt} from "./ScenePrompt.ts";

export function illustrationPrompt(path: string, data: any): string {
    const [, section] = path.split('/');
    if (section === 'cards') {
        return cardPrompt(data);
    }
    return isDescribable(data) ? storyPrompt(data) : scenePrompt(data);
}