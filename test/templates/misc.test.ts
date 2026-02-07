import {describe, expect, test} from "bun:test";
import {roundStep, wellFormed, compactText} from "../../src/templates/misc.ts";

describe("misc", () => {
    describe("roundStep", () => {
        test("rounds to nearest 0.5 by default", () => {
            expect(roundStep(3.3)).toBe(3.5);
            expect(roundStep(3.7)).toBe(3.5);
            expect(roundStep(3.8)).toBe(4.0);
            expect(roundStep(3.25)).toBe(3.5);
            expect(roundStep(3.24)).toBe(3.0);
        });

        test("rounds to custom step", () => {
            expect(roundStep(3.3, 1)).toBe(3);
            expect(roundStep(3.7, 1)).toBe(4);
        });

        test("handles zero", () => {
            expect(roundStep(0)).toBe(0);
        });
    });

    describe("wellFormed", () => {
        test("returns empty string for null/undefined", () => {
            expect(wellFormed(null)).toBe("");
            expect(wellFormed(undefined)).toBe("");
        });

        test("passes through plain text", () => {
            expect(wellFormed("hello world")).toContain("hello world");
        });

        test("handles HTML entities", () => {
            const result = wellFormed("A &amp; B");
            expect(result).toContain("A &amp; B");
        });
    });

    describe("compactText", () => {
        test("returns empty string for null/undefined", () => {
            expect(compactText(null)).toBe("");
            expect(compactText(undefined)).toBe("");
        });

        test("collapses whitespace", () => {
            expect(compactText("hello   world")).toBe("hello world");
        });

        test("collapses newlines and tabs", () => {
            expect(compactText("hello\n\n\tworld")).toBe("hello world");
        });
    });
});
