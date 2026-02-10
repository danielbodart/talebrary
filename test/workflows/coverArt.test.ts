import {describe, expect, test} from "bun:test";
import {coverArtWorkflow} from "../../src/workflows/coverArt.ts";
import {InMemoryStep} from "../../src/workflows/mod.ts";
import {DumbAi} from "../../src/bun/DumbAi.ts";
import type {GameStory} from "../../src/games/GameFinder.ts";
import type {Http} from "../../src/http/mod.ts";
import type {TalebraryAi} from "../../src/ai/TalebraryAi.ts";
import {stubBucket} from "../stubBucket.ts";

function game(overrides: Partial<GameStory> = {}): GameStory {
    return {
        id: "abc",
        title: "Adventure",
        author: "Author",
        url: "http://ifarchive.org/adventure.z5",
        coverart: "https://ifdb.org/viewgame?coverart&id=abc",
        type: "zcode",
        ...overrides,
    };
}

const dumbAi = new DumbAi();

describe("coverArtWorkflow", () => {
    describe("with coverart URL", () => {
        test("fetches original, stores it, and style-transfers", async () => {
            let fetchedUrl = '';
            const http: Http = async (request) => {
                fetchedUrl = request.url;
                return new Response("image data", {
                    status: 200,
                    headers: {"content-type": "image/jpeg"},
                });
            };
            const bucket = stubBucket();

            const step = new InMemoryStep();
            const workflow = coverArtWorkflow({http, ai: dumbAi, bucket});
            const result = await workflow({game: game()}, step);

            expect(fetchedUrl).toBe("https://ifdb.org/viewgame?coverart&id=abc");
            expect(result.bucketKey).toStartWith("workflow-images/");
            expect(step.results.has('fetch-and-store-original')).toBe(true);
            expect(step.results.has('style-transfer')).toBe(true);
        });

        test("falls back to 4b model when 9b style transfer fails", async () => {
            let callCount = 0;
            const failFirstAi: TalebraryAi = {
                generateText: async () => ({}) as any,
                generateImage: async () => {
                    callCount++;
                    if (callCount === 1) throw new Error("9b failed");
                    return new Uint8Array([1, 2, 3]);
                },
            };

            const step = new InMemoryStep();
            const workflow = coverArtWorkflow({
                http: async () => new Response("original image", {
                    status: 200,
                    headers: {"content-type": "image/png"},
                }),
                ai: failFirstAi,
                bucket: stubBucket(),
            });

            const result = await workflow({game: game()}, step);

            expect(result.bucketKey).toStartWith("workflow-images/");
            expect(step.results.has('style-transfer-fallback')).toBe(true);
            expect(result.cacheControl).toBeUndefined();
        });

        test("falls back to default artwork when both style transfer models fail", async () => {
            const failingAi: TalebraryAi = {
                generateText: async () => ({}) as any,
                generateImage: async (_model, input) => {
                    if (input.sourceImage) throw new Error("AI failed");
                    return new Uint8Array([4, 5, 6]);
                },
            };

            const step = new InMemoryStep();
            const workflow = coverArtWorkflow({
                http: async () => new Response("original image", {
                    status: 200,
                    headers: {"content-type": "image/png"},
                }),
                ai: failingAi,
                bucket: stubBucket(),
            });

            const result = await workflow({game: game()}, step);

            expect(result.bucketKey).toStartWith("workflow-images/");
            expect(result.contentType).toBe("image/jpeg");
            expect(result.description).toContain("Adventure");
            expect(result.description).toContain("library");
            expect(step.results.has('generate-default')).toBe(true);
        });

        test("throws when original fetch fails", async () => {
            const workflow = coverArtWorkflow({
                http: async () => new Response("", {status: 404}),
                ai: dumbAi,
                bucket: stubBucket(),
            });

            expect(workflow({game: game()}, new InMemoryStep())).rejects.toThrow("Failed to fetch cover art: 404");
        });
    });

    describe("without coverart URL (AI generation)", () => {
        test("generates prompt then image", async () => {
            const step = new InMemoryStep();
            const workflow = coverArtWorkflow({
                http: async () => new Response("", {status: 200}),
                ai: dumbAi,
                bucket: stubBucket(),
            });

            const result = await workflow({game: game({coverart: ""})}, step);

            expect(result.contentType).toBe("image/jpeg");
            expect(result.description).toBeString();
            expect(result.description!.length).toBeGreaterThan(0);
            expect(result.bucketKey).toStartWith("workflow-images/");
            expect(step.results.has('generate-prompt')).toBe(true);
            expect(step.results.has('generate-image')).toBe(true);
        });

        test("falls back to default book cover prompt when AI returns 404", async () => {
            const noSceneAi: TalebraryAi = {
                generateText: async () => ({status: 404, statusText: "No Scene Found", reason: "Not visual"}) as any,
                generateImage: async () => new Uint8Array(0),
            };

            const workflow = coverArtWorkflow({
                http: async () => new Response("", {status: 200}),
                ai: noSceneAi,
                bucket: stubBucket(),
            });

            const result = await workflow({game: game({coverart: ""})}, new InMemoryStep());

            expect(result.description).toContain("Adventure");
            expect(result.contentType).toBe("image/jpeg");
        });

        test("throws when prompt generation returns error status", async () => {
            const errorAi: TalebraryAi = {
                generateText: async () => ({status: 500, statusText: "Server Error", reason: "Overloaded"}) as any,
                generateImage: async () => new Uint8Array(0),
            };

            const workflow = coverArtWorkflow({
                http: async () => new Response("", {status: 200}),
                ai: errorAi,
                bucket: stubBucket(),
            });

            expect(workflow({game: game({coverart: ""})}, new InMemoryStep()))
                .rejects.toThrow("Prompt generation failed");
        });
    });
});
