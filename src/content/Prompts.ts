import {commonCommands, type Describable, isDescribable, type SceneContext, type ScopedPrompt} from "../types.ts";

function scenePrompt(data: SceneContext) {
    return `Create an illustration for a scene called "${data.scene.title}" and described as 
            "${data.scene.description.replace('"', '`')}"
            The scene is part of the interactive fiction called "${data.story.title}" 
            "${data.story.description ? `and described as "${data.story.description}".` : ''}
            ${data.previous ? `The scene should be consistent with the previous scene, which was called "${data.previous.title}" 
            and described as "${data.previous.description.replace('"', '`')}"` : ''}`;
}

function storyPrompt(data: Describable) {
    return `Create the cover art illustration for the interactive fiction called "${data.title}" 
            "${data.description ? `and described as "${data.description}".` : ''}`;
}

function cardPrompt(data: Describable) {
    return `Create the illustration for a playing card that is part of a board game. The card is titled "${data.title}" 
            "${data.description ? `and described as "${data.description}".` : ''}.`;
}

export function illustrationPrompt(path: string, data: any): string {
    const [, section] = path.split('/');
    if (section === 'cards') {
        return cardPrompt(data);
    }
    return isDescribable(data) ? storyPrompt(data) : scenePrompt(data);
}

export interface SuggestionedActions {
    nouns: string[];
    commands: string[];
    actions: string[];
}

export const SuggestedActionsExample: SuggestionedActions = {
    nouns: ['atrium', 'library', 'librarian', 'bookcases', "desk", "sandwich", "room"],
    commands: ["examine", "talk to", "take", "eat", "east"],
    actions: ["examine atrium", "examine library", "talk to librarian", "examine bookcases", "examine desk", "open draw", "go east"]
};

export function actionsPrompt(data: Describable): ScopedPrompt {

    const systemPrompt = `You are a interactive fiction copilot API. You must follow the following steps:
1. Identity nouns in the input text
2. Filter the commands list to actions that might be helpful give the nouns identified in 1
3. Create some suggest actions that combine the command with a single noun. These actions are normally just 2 words, max 4
3. Return all 3 in a JSON response

commands list: ${JSON.stringify(commonCommands)}

Example request

${JSON.stringify({
        title: "The Atrium",
        description: "You find your self standing in the atrium of a huge library, in front of you stands the librarian, ready to help you find whatever adventure you require. To either side of him are row apon row of bookcases. On his desk is half eaten sandwich, the desk has a single draw.  To the east is the reading room"
    })}

Example response 

${JSON.stringify(SuggestedActionsExample)}

Do not use commands not in the list, do not use nouns not identified from the input. Do not add extra human readable comments before or after the JSON response`
    const userPrompt = JSON.stringify(data);

    return {
        messages: [
            {role: 'system', content: systemPrompt},
            {role: 'user', content: userPrompt}
        ],
    }
}