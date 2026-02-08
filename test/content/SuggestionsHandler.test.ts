import {describe, expect, test} from "bun:test";
import {SuggestionsHandler} from "../../src/content/SuggestionsHandler.ts";
import {DumbAi} from "../../src/bun/DumbAi.ts";
import type {Describable} from "../../src/types.ts";
import type {TalebraryAi} from "../../src/ai/TalebraryAi.ts";

describe("SuggestionsHandler", () => {
    const ai = new DumbAi();
    const handler = new SuggestionsHandler({ai});

    function requestWithPrompt(data: Describable): Request {
        const prompt = encodeURIComponent(JSON.stringify(data));
        return new Request(`http://test/content/123/suggestions?prompt=${prompt}`);
    }

    test("returns 404 when no prompt parameter", async () => {
        const response = await handler.handle(new Request("http://test/content/123/suggestions"));
        expect(response.status).toBe(404);
    });

    test("returns JSON suggestions for valid prompt", async () => {
        const response = await handler.handle(requestWithPrompt({
            title: "The Cave",
            description: "You are in a dark cave. To the north is a passage."
        }));
        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toBe("application/json");

        const json = await response.json();
        expect(json.commands).toBeArray();
        expect(json.commands).toContain("look");
        expect(json.commands).toContain("north");
    });

    test("returns suggestions with people detection", async () => {
        const response = await handler.handle(requestWithPrompt({
            title: "The Library",
            description: "A librarian stands before you. She is holding a book."
        }));
        const json = await response.json();
        expect(json.people).toBe(true);
        expect(json.commands).toContain("ask");
    });

    test("returns 500 when AI throws", async () => {
        const badAi: TalebraryAi = {
            generateText: async () => { throw new Error("Parse failed"); },
            generateImage: async () => new Uint8Array(0),
        };
        const badHandler = new SuggestionsHandler({ai: badAi});
        const response = await badHandler.handle(requestWithPrompt({
            title: "Test",
            description: "Test scene"
        }));
        expect(response.status).toBe(500);
        const text = await response.text();
        expect(text).toContain("Model failed to return JSON");
    });
});
