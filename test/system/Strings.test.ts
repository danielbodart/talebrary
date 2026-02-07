import {describe, expect, test} from "bun:test";
import {words, wordCount, capitalWords} from "../../src/system/Strings.ts";

describe("Strings", () => {
    describe("words", () => {
        test("splits simple sentence into words", () => {
            expect(words("hello world")).toEqual(["hello", "world"]);
        });

        test("handles punctuation", () => {
            expect(words("You are standing at the end of a road.")).toEqual(
                ["You", "are", "standing", "at", "the", "end", "of", "a", "road"]
            );
        });

        test("returns empty array for undefined", () => {
            expect(words(undefined)).toEqual([]);
        });

        test("returns empty array for empty string", () => {
            expect(words("")).toEqual([]);
        });

        test("handles numbers", () => {
            expect(words("room 42")).toEqual(["room", "42"]);
        });
    });

    describe("wordCount", () => {
        test("counts words in a sentence", () => {
            expect(wordCount("hello world")).toBe(2);
        });

        test("returns 0 for empty string", () => {
            expect(wordCount("")).toBe(0);
        });
    });

    describe("capitalWords", () => {
        test("matches sequences of uppercase words", () => {
            expect("THE DARK FOREST awaits".match(capitalWords)).toEqual(["THE DARK FOREST"]);
        });

        test("returns null when no uppercase words found", () => {
            expect("hello world".match(capitalWords)).toBeNull();
        });
    });
});
