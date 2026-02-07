import {describe, expect, test} from "bun:test";
import {Uri} from "../../src/http/Uri.ts";

describe("Uri", () => {
    test("parses full URL", () => {
        const uri = new Uri("https://example.com/path?query=1#fragment");
        expect(uri.scheme).toBe("https");
        expect(uri.authority).toBe("example.com");
        expect(uri.path).toBe("/path");
        expect(uri.query).toBe("query=1");
        expect(uri.fragment).toBe("fragment");
    });

    test("parses URL without query or fragment", () => {
        const uri = new Uri("https://example.com/path");
        expect(uri.path).toBe("/path");
        expect(uri.query).toBeUndefined();
        expect(uri.fragment).toBeUndefined();
    });

    test("parses relative path", () => {
        const uri = new Uri("/content/123/art");
        expect(uri.scheme).toBeUndefined();
        expect(uri.authority).toBeUndefined();
        expect(uri.path).toBe("/content/123/art");
    });

    test("parses path with query", () => {
        const uri = new Uri("/content/123/suggestions?prompt=hello");
        expect(uri.path).toBe("/content/123/suggestions");
        expect(uri.query).toBe("prompt=hello");
    });

    test("toString roundtrips full URL", () => {
        const original = "https://example.com/path?query=1#fragment";
        expect(new Uri(original).toString()).toBe(original);
    });

    test("toString roundtrips relative path", () => {
        const original = "/content/123/art";
        expect(new Uri(original).toString()).toBe(original);
    });

    test("path is mutable", () => {
        const uri = new Uri("/test/");
        uri.path += "index.html";
        expect(uri.toString()).toBe("/test/index.html");
    });

    test("query is mutable", () => {
        const uri = new Uri("/test");
        uri.query = "foo=bar";
        expect(uri.toString()).toBe("/test?foo=bar");
    });

    test("toJSON returns string representation", () => {
        const uri = new Uri("https://example.com/path");
        expect(JSON.stringify(uri)).toBe('"https://example.com/path"');
    });
});
