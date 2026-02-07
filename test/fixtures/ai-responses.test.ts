import {describe, expect, test} from "bun:test";
import {parseAiJsonResponse} from "../../src/ai/parseAiJsonResponse.ts";
import fixtures from "./ai-responses.json";

/**
 * Validates that real AI responses (captured from Cloudflare) match the shapes
 * our code expects. If the AI model output format changes, these tests will
 * catch it when you re-run the capture script.
 */
describe("AI response fixtures", () => {
    describe("suggestions", () => {
        for (const fixture of fixtures.suggestions) {
            test(`${fixture.input.title}: response is parseable`, () => {
                const parsed = parseAiJsonResponse(fixture.output);
                expect(parsed).toHaveProperty("people");
                expect(parsed).toHaveProperty("nouns");
                expect(parsed).toHaveProperty("commands");
                expect(parsed).toHaveProperty("actions");
            });

            test(`${fixture.input.title}: nouns are strings`, () => {
                const parsed = parseAiJsonResponse(fixture.output);
                expect(parsed.nouns).toBeArray();
                for (const noun of parsed.nouns) {
                    expect(typeof noun).toBe("string");
                }
            });

            test(`${fixture.input.title}: commands are strings`, () => {
                const parsed = parseAiJsonResponse(fixture.output);
                expect(parsed.commands).toBeArray();
                for (const cmd of parsed.commands) {
                    expect(typeof cmd).toBe("string");
                }
            });

            test(`${fixture.input.title}: people is boolean`, () => {
                const parsed = parseAiJsonResponse(fixture.output);
                expect(typeof parsed.people).toBe("boolean");
            });
        }
    });

    describe("illustrations", () => {
        for (const fixture of fixtures.illustrations) {
            test(`${fixture.input.scene.title}: response is parseable`, () => {
                const parsed = parseAiJsonResponse(fixture.output);
                // Either a prompt or a 404 rejection
                const isPrompt = "prompt" in parsed;
                const isRejection = "status" in parsed;
                expect(isPrompt || isRejection).toBe(true);
            });

            test(`${fixture.input.scene.title}: prompt responses have string prompt`, () => {
                const parsed = parseAiJsonResponse(fixture.output);
                if ("prompt" in parsed) {
                    expect(typeof parsed.prompt).toBe("string");
                    expect(parsed.prompt.length).toBeGreaterThan(0);
                }
            });

            test(`${fixture.input.scene.title}: rejection responses have status and reason`, () => {
                const parsed = parseAiJsonResponse(fixture.output);
                if ("status" in parsed && !("prompt" in parsed)) {
                    expect(typeof parsed.status).toBe("number");
                    expect(typeof parsed.reason).toBe("string");
                }
            });
        }
    });
});
