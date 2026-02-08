import {always, common, controls, directions, extra, peopleCommands, type Describable, type ScopedPrompt} from "../types.ts";

export interface SuggestionTree {
    people: boolean;
    tree: Record<string, string[]>;
}

const commandCategories = {
    "always available": always,
    "people interactions (only if people present)": peopleCommands,
    "directions/movement": directions,
    "common object interactions": common,
    "additional actions": extra,
    "game controls": controls,
};

export const ExampleInput: Describable = {
    title: "The Atrium",
    description: "You find your self standing in the atrium of a huge library, in front of you stands the librarian, ready to help you find whatever adventure you require. To either side of him are row apon row of bookcases. On his desk is half eaten sandwich, the desk has a single draw.  To the east is the reading room"
};

const ExampleOutput: SuggestionTree = {
    people: true,
    tree: {
        "examine": ["atrium", "library", "bookcases", "desk", "sandwich"],
        "ask": ["librarian"],
        "talk": ["librarian"],
        "take": ["sandwich"],
        "eat": ["sandwich"],
        "open": ["draw"],
        "east": [],
        "look": [],
        "inventory": [],
    }
};

export function suggestionsTreePrompt(data: Describable): ScopedPrompt {
    const systemPrompt = `You are an interactive fiction copilot API. Given a scene description, build a command tree for the player.

Steps:
1. Identify all nouns (objects, people, locations) in the scene
2. Determine if people are present
3. For each relevant command, list the nouns it could apply to
4. Remove commands that have no sensible use in this scene
5. Sort by usefulness — most likely commands first, most likely nouns first within each command
6. Return JSON

Command vocabulary by category:
${Object.entries(commandCategories).map(([cat, cmds]) => `  ${cat}: ${JSON.stringify(cmds)}`).join("\n")}

Tree format:
- Keys are commands (verbs/directions)
- Values are arrays of nouns that command applies to
- Empty array means the command stands alone (e.g. "inventory", "north")
- Only include commands and nouns relevant to the scene
- Only use nouns found in the scene description
- Only use commands from the vocabulary above

Example input:
${JSON.stringify(ExampleInput)}

Example response:
${JSON.stringify(ExampleOutput)}

Return only valid JSON, no extra text.`;

    return {
        messages: [
            {role: 'system', content: systemPrompt},
            {role: 'user', content: JSON.stringify(data)},
        ],
    };
}
