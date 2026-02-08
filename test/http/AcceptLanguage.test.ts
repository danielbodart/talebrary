import {describe, expect, test} from "bun:test";
import {parseAcceptLanguage} from "../../src/http/AcceptLanguage.ts";

describe("parseAcceptLanguage", () => {
    test("null header returns English defaults", () => {
        expect(parseAcceptLanguage(null)).toEqual(['en', 'en-us', 'en-gb']);
    });

    test("empty string returns English defaults", () => {
        expect(parseAcceptLanguage('')).toEqual(['en', 'en-us', 'en-gb']);
    });

    test("English header returns just English defaults", () => {
        expect(parseAcceptLanguage('en')).toEqual(['en', 'en-us', 'en-gb']);
    });

    test("French header includes English and French", () => {
        const result = parseAcceptLanguage('fr');
        expect(result).toContain('en');
        expect(result).toContain('en-us');
        expect(result).toContain('en-gb');
        expect(result).toContain('fr');
    });

    test("parses multiple languages with quality values", () => {
        const result = parseAcceptLanguage('fr-CH, fr;q=0.9, en;q=0.8, de;q=0.7');
        expect(result).toContain('en');
        expect(result).toContain('fr-ch');
        expect(result).toContain('fr');
        expect(result).toContain('de');
    });

    test("extracts base language from locale variants", () => {
        const result = parseAcceptLanguage('fr-CH');
        expect(result).toContain('fr-ch');
        expect(result).toContain('fr');
    });

    test("deduplicates language codes", () => {
        const result = parseAcceptLanguage('en, en-US, en-GB');
        const enCount = result.filter(c => c === 'en').length;
        expect(enCount).toBe(1);
    });

    test("lowercases all codes", () => {
        const result = parseAcceptLanguage('FR-CH, DE');
        expect(result).toContain('fr-ch');
        expect(result).toContain('fr');
        expect(result).toContain('de');
    });
});
