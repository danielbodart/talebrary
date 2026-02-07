import {describe, expect, test} from "bun:test";
import {templateHandler} from "../../src/templates/TemplateHandler.ts";

describe("TemplateHandler", () => {
    test("applies template when meta tag present", async () => {
        const html = `<html><head><meta name="template" content="default"></head><body><main>hello</main></body></html>`;
        const handler = templateHandler(async () =>
            new Response(html, {headers: {"content-type": "text/html"}}));

        const response = await handler(new Request("http://test/page"));
        const text = await response.text();
        expect(text).toContain("hello");
    });

    test("passes through HTML without template meta tag", async () => {
        const html = `<html><head></head><body>hello</body></html>`;
        const handler = templateHandler(async () =>
            new Response(html, {headers: {"content-type": "text/html"}}));

        const response = await handler(new Request("http://test/page"));
        const text = await response.text();
        expect(text).toContain("hello");
    });

    test("passes through non-HTML content", async () => {
        const handler = templateHandler(async () =>
            new Response('{"key":"value"}', {headers: {"content-type": "application/json"}}));

        const response = await handler(new Request("http://test/page"));
        expect(await response.text()).toBe('{"key":"value"}');
    });

    test("passes through error responses", async () => {
        const handler = templateHandler(async () =>
            new Response("not found", {status: 404}));

        const response = await handler(new Request("http://test/page"));
        expect(response.status).toBe(404);
    });

    test("detects HTML from .html extension when no content-type", async () => {
        const html = `<html><head><meta name="template" content="default"></head><body><main>hello</main></body></html>`;
        const handler = templateHandler(async () =>
            new Response(html, {status: 200}));

        const response = await handler(new Request("http://test/page.html"));
        const text = await response.text();
        expect(text).toContain("hello");
    });

    test("ignores unknown template names", async () => {
        const html = `<html><head><meta name="template" content="unknown"></head><body>hello</body></html>`;
        const handler = templateHandler(async () =>
            new Response(html, {headers: {"content-type": "text/html"}}));

        const response = await handler(new Request("http://test/page"));
        const text = await response.text();
        expect(text).toContain("hello");
    });
});
