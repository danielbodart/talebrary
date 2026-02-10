import {describe, expect, test} from "bun:test";
import {suggestionsTreePrompt, ExampleInput} from "../../src/prompts/SuggestionsTreePrompt.ts";
import {generateIllustrationPrompt, exampleRequest, exampleResponse} from "../../src/prompts/GenerateIllustrationPrompt.ts";
import {illustrationPrompt} from "../../src/prompts/IllustrationPrompt.ts";
import {scenePrompt} from "../../src/prompts/ScenePrompt.ts";
import {storyPrompt} from "../../src/prompts/StoryPrompt.ts";
import {cardPrompt} from "../../src/prompts/CardPrompt.ts";
import type {SceneContext} from "../../src/types.ts";

describe("suggestionsTreePrompt", () => {
    test("returns ScopedPrompt with system and user messages", () => {
        const result = suggestionsTreePrompt(ExampleInput);
        expect(result.messages).toHaveLength(2);
        expect(result.messages[0].role).toBe("system");
        expect(result.messages[1].role).toBe("user");
    });

    test("system message contains command vocabulary", () => {
        const result = suggestionsTreePrompt(ExampleInput);
        expect(result.messages[0].content).toContain("command tree");
        expect(result.messages[0].content).toContain("examine");
    });

    test("system message contains example input and output", () => {
        const result = suggestionsTreePrompt(ExampleInput);
        expect(result.messages[0].content).toContain(JSON.stringify(ExampleInput));
        expect(result.messages[0].content).toContain('"tree"');
    });

    test("user message is JSON-stringified input", () => {
        const input = {title: "Test", description: "A test scene"};
        const result = suggestionsTreePrompt(input);
        expect(result.messages[1].content).toBe(JSON.stringify(input));
    });
});

describe("generateIllustrationPrompt", () => {
    test("returns ScopedPrompt with system and user messages", () => {
        const result = generateIllustrationPrompt(exampleRequest);
        expect(result.messages).toHaveLength(2);
        expect(result.messages[0].role).toBe("system");
        expect(result.messages[1].role).toBe("user");
    });

    test("system message contains example request and response", () => {
        const result = generateIllustrationPrompt(exampleRequest);
        expect(result.messages[0].content).toContain(JSON.stringify(exampleRequest));
        expect(result.messages[0].content).toContain(JSON.stringify(exampleResponse));
    });

    test("user message is JSON-stringified scene context", () => {
        const result = generateIllustrationPrompt(exampleRequest);
        expect(result.messages[1].content).toBe(JSON.stringify(exampleRequest));
    });

    test("system message mentions image generation", () => {
        const result = generateIllustrationPrompt(exampleRequest);
        expect(result.messages[0].content).toContain("image generation model");
    });
});

describe("scenePrompt", () => {
    test("includes scene title and description", () => {
        const data: SceneContext = {
            story: {title: "Adventure", description: "A great story"},
            scene: {title: "The Cave", description: "A dark cave"},
        };
        const result = scenePrompt(data);
        expect(result).toContain("The Cave");
        expect(result).toContain("A dark cave");
    });

    test("includes story context", () => {
        const data: SceneContext = {
            story: {title: "Adventure", description: "A great story"},
            scene: {title: "The Cave", description: "A dark cave"},
        };
        const result = scenePrompt(data);
        expect(result).toContain("Adventure");
        expect(result).toContain("A great story");
    });

    test("includes previous scene when present", () => {
        const data: SceneContext = {
            story: {title: "Adventure", description: "A great story"},
            scene: {title: "The Cave", description: "A dark cave"},
            previous: {title: "The Forest", description: "A dense forest"},
        };
        const result = scenePrompt(data);
        expect(result).toContain("The Forest");
        expect(result).toContain("A dense forest");
    });

    test("replaces all double quotes in scene description", () => {
        const data: SceneContext = {
            story: {title: "Adventure", description: ""},
            scene: {title: "Test", description: 'He said "hello" and she said "bye"'},
        };
        const result = scenePrompt(data);
        expect(result).not.toContain('"hello"');
        expect(result).toContain("`hello`");
        expect(result).toContain("`bye`");
    });

    test("replaces all double quotes in previous description", () => {
        const data: SceneContext = {
            story: {title: "Adventure", description: ""},
            scene: {title: "Test", description: "scene"},
            previous: {title: "Prev", description: 'They "ran" and "hid"'},
        };
        const result = scenePrompt(data);
        expect(result).toContain("`ran`");
        expect(result).toContain("`hid`");
    });
});

describe("storyPrompt", () => {
    test("includes title", () => {
        const result = storyPrompt({title: "Adventure", description: "A great story"});
        expect(result).toContain("Adventure");
    });

    test("includes description when present", () => {
        const result = storyPrompt({title: "Adventure", description: "A great story"});
        expect(result).toContain("A great story");
    });

    test("handles empty description", () => {
        const result = storyPrompt({title: "Adventure", description: ""});
        expect(result).toContain("Adventure");
    });
});

describe("cardPrompt", () => {
    test("includes title and description", () => {
        const result = cardPrompt({title: "Fire", description: "A blazing fire", rules: "Deal 3 damage"});
        expect(result).toContain("Fire");
        expect(result).toContain("A blazing fire");
    });
});

describe("illustrationPrompt", () => {
    test("dispatches to cardPrompt for /cards path", () => {
        const result = illustrationPrompt("/cards/art", {title: "Fire", description: "A blazing fire", rules: ""});
        expect(result).toContain("card");
        expect(result).toContain("Fire");
    });

    test("dispatches to storyPrompt for Describable data", () => {
        const result = illustrationPrompt("/content/123/art", {title: "Adventure", description: "A story"});
        expect(result).toContain("cover art");
        expect(result).toContain("Adventure");
    });

    test("dispatches to scenePrompt for SceneContext data", () => {
        const result = illustrationPrompt("/content/123/art", {
            story: {title: "Adventure", description: ""},
            scene: {title: "Cave", description: "A dark cave"},
        });
        expect(result).toContain("Cave");
        expect(result).toContain("A dark cave");
    });
});
