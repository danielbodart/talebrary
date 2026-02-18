import {describe, expect, test} from "bun:test";
import {roundStep, wellFormed, compactText, safeHtml} from "../../src/templates/misc.ts";

function renderFragment(result: DocumentFragment | string): string {
    if (typeof result === 'string') return result;
    return Array.from(result.childNodes).map(n => n.toString()).join('');
}

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

    describe("safeHtml", () => {
        test("returns empty string for null/undefined", () => {
            expect(safeHtml(null)).toBe("");
            expect(safeHtml(undefined)).toBe("");
        });

        test("passes through plain text", () => {
            expect(renderFragment(safeHtml("hello world"))).toBe("hello world");
        });

        test("preserves safe tags", () => {
            expect(renderFragment(safeHtml("<i>italic</i> and <b>bold</b>"))).toBe("<i>italic</i> and <b>bold</b>");
            expect(renderFragment(safeHtml("<em>emphasis</em>"))).toBe("<em>emphasis</em>");
            expect(renderFragment(safeHtml("<strong>strong</strong>"))).toBe("<strong>strong</strong>");
        });

        test("strips unsafe tags but keeps their text", () => {
            expect(renderFragment(safeHtml("<script>alert(1)</script>"))).toBe("alert(1)");
            expect(renderFragment(safeHtml("<div>text</div>"))).toBe("text");
            expect(renderFragment(safeHtml('<a href="http://evil.com">link</a>'))).toBe("link");
        });

        test("strips all attributes from safe tags", () => {
            expect(renderFragment(safeHtml('<i onclick="alert(1)">text</i>'))).toBe("<i>text</i>");
            expect(renderFragment(safeHtml('<b style="color:red">text</b>'))).toBe("<b>text</b>");
        });

        test("strips blurb attributions", () => {
            expect(renderFragment(safeHtml('A great game. [--blurb from The Z-Files Catalogue]'))).toBe("A great game.");
            expect(renderFragment(safeHtml("Some text [--blurb from author's website]"))).toBe("Some text");
        });

        test("handles nested safe tags", () => {
            expect(renderFragment(safeHtml("<p><i>italic in paragraph</i></p>"))).toBe("<p><i>italic in paragraph</i></p>");
        });

        test("unwraps unsafe tags preserving safe children", () => {
            expect(renderFragment(safeHtml("<div><i>keep this</i></div>"))).toBe("<i>keep this</i>");
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
