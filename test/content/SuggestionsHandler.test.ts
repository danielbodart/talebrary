import {describe, expect, test} from "bun:test";
import {SuggestionsHandler} from "../../src/content/SuggestionsHandler.ts";
import {DumbAi} from "../../src/bun/DumbAi.ts";
import type {Describable} from "../../src/types.ts";

describe("SuggestionsHandler", () => {
    const ai = new DumbAi();
    const handler = new SuggestionsHandler({ai: ai as any});

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

    test("returns 500 when AI returns non-JSON text", async () => {
        const badAi = {
            run: async () => ({response: "I cannot help with that"})
        };
        const badHandler = new SuggestionsHandler({ai: badAi as any});
        const response = await badHandler.handle(requestWithPrompt({
            title: "Test",
            description: "Test scene"
        }));
        expect(response.status).toBe(500);
        const text = await response.text();
        expect(text).toContain("Model failed to return JSON");
    });

    test("returns 404 when AI response has no response field", async () => {
        const noResponseAi = {
            run: async () => ({image: new Uint8Array(0)})
        };
        const badHandler = new SuggestionsHandler({ai: noResponseAi as any});
        const response = await badHandler.handle(requestWithPrompt({
            title: "Test",
            description: "Test scene"
        }));
        expect(response.status).toBe(404);
    });

    test("handles AI returning object instead of string", async () => {
        const objectAi = {
            run: async () => ({
                response: {actions: ["look around"], commands: ["look"], nouns: ["room"], people: false}
            })
        };
        const objectHandler = new SuggestionsHandler({ai: objectAi as any});
        const response = await objectHandler.handle(requestWithPrompt({
            title: "Test",
            description: "A simple room"
        }));
        expect(response.status).toBe(200);
        const json = await response.json();
        expect(json.commands).toContain("look");
    });
});
