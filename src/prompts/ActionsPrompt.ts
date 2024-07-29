import {commands, type Describable, type ScopedPrompt} from "../types.ts";

export interface Suggestions {
    people: boolean;
    nouns: string[];
    commands: string[];
    actions: string[];
}

export const ExamplePrompt: Describable = {
    title: "The Atrium",
    description: "You find your self standing in the atrium of a huge library, in front of you stands the librarian, ready to help you find whatever adventure you require. To either side of him are row apon row of bookcases. On his desk is half eaten sandwich, the desk has a single draw.  To the east is the reading room"
};

export const ExampleSuggestions: Suggestions = {
    people: true,
    nouns: ['atrium', 'library', 'librarian', 'bookcases', "desk", "sandwich", "room"],
    commands: ["examine", "talk to", "take", "eat", "east"],
    actions: ["examine atrium", "examine library", "talk to librarian", "examine bookcases", "examine desk", "open draw", "go east"]
};

export function actionsPrompt(data: Describable): ScopedPrompt {
    const systemPrompt = `You are a interactive fiction copilot API. You must follow the following steps:
1. Identity nouns in the input text
2. Identify if people are present in the scene 
3. Filter the commands list to actions that might be helpful give the nouns identified in 1
4. Create some suggest actions that combine the command with a single noun. These actions are normally just 2 words, max 4
5. Return all 4 in a JSON response

commands list: ${JSON.stringify(commands)}

Example request:

${JSON.stringify(ExamplePrompt)}

Example response: 

${JSON.stringify(ExampleSuggestions)}

Do not use commands not in the list. 
Do not use nouns not identified from the input. 
Do not add extra human readable comments before or after the JSON response`

    const userPrompt = JSON.stringify(data);

    return {
        messages: [
            {role: 'system', content: systemPrompt},
            {role: 'user', content: userPrompt}
        ],
    }
}