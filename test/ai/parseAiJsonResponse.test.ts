import {describe, expect, test} from "bun:test";
import {parseAiJsonResponse} from "../../src/ai/parseAiJsonResponse.ts";

describe("parseAiJsonResponse", () => {
    test("parses JSON string response", () => {
        const output = {response: '{"actions":["look","examine"]}'};
        expect(parseAiJsonResponse(output)).toEqual({actions: ["look", "examine"]});
    });

    test("passes through object response", () => {
        const data = {actions: ["look", "examine"]};
        const output = {response: data};
        expect(parseAiJsonResponse(output)).toBe(data);
    });

    test("throws on missing response field", () => {
        expect(() => parseAiJsonResponse({} as any)).toThrow("AI response has no response field");
    });

    test("throws on null response", () => {
        expect(() => parseAiJsonResponse({response: null} as any)).toThrow("AI response has no response field");
    });

    test("throws on invalid JSON string", () => {
        expect(() => parseAiJsonResponse({response: "not json"})).toThrow();
    });

    test("handles nested JSON in string response", () => {
        const nested = {prompt: "A cat in a forest", style: "illustration"};
        const output = {response: JSON.stringify(nested)};
        expect(parseAiJsonResponse(output)).toEqual(nested);
    });

    test("handles response with status field (non-scene)", () => {
        const output = {response: JSON.stringify({status: 404, reason: "Not a visual scene"})};
        const result = parseAiJsonResponse(output) as any;
        expect(result.status).toBe(404);
        expect(result.reason).toBe("Not a visual scene");
    });
});
