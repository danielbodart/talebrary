import {describe, expect, test} from "bun:test";
import {DumbAi} from "../../src/bun/DumbAi.ts";
import {suggestionsPrompt, ExamplePrompt, type Suggestions} from "../../src/prompts/SuggestionsPrompt.ts";

describe("DumbAi", () => {
    const ai = new DumbAi();
    test("can detect people and directions", async () => {
        const result = await ai.run("@cf/meta/llama-3-8b-instruct-awq", suggestionsPrompt(ExamplePrompt));
        // @ts-ignore
        const suggestions: Suggestions = JSON.parse(result!['response']!);
        expect(suggestions.people).toBe(true);
        expect(suggestions.commands.sort()).toEqual([
            "ask", "down", "east", "examine", "give", "go", "help", "in", "inventory", "look", "north", "out", "show", "south", "talk", "tell", "up", "west"
        ]);
    });
});