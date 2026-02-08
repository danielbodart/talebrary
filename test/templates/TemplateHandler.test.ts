import {describe, expect, test} from "bun:test";
import {templateHandler} from "../../src/templates/TemplateHandler.ts";
import type {Renderer} from "../../src/templates/Renderer.ts";
import {parseHTML} from "linkedom";

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

    test("applies renderers before template processing", async () => {
        const html = `<html><head><meta name="template" content="default"></head><body><script type="application/ld+json" class="greeting">{"message":"hi"}</script></body></html>`;

        const greeting: Renderer = (element) => {
            const el = element.ownerDocument.createElement('p');
            el.textContent = JSON.parse(element.textContent ?? '{}').message;
            return el;
        };

        const handler = templateHandler(
            async () => new Response(html, {headers: {"content-type": "text/html"}}),
            {'script[type="application/ld+json"].greeting': greeting}
        );

        const response = await handler(new Request("http://test/page"));
        const text = await response.text();
        expect(text).toContain('<p>hi</p>');
        expect(text).not.toContain('application/ld+json');
    });

    test("processes slots to extract content from page", async () => {
        const html = `<html><head><title>My Page</title><meta name="template" content="default"></head><body><main>content</main></body></html>`;
        const handler = templateHandler(async () =>
            new Response(html, {headers: {"content-type": "text/html"}}));

        const response = await handler(new Request("http://test/page"));
        const text = await response.text();
        const {document} = parseHTML(text);

        // Template should have extracted head and body children via slots
        expect(document.querySelector('title')?.textContent).toBe('My Page');
        expect(document.querySelector('main')?.textContent).toBe('content');
    });

    test("processes includes via slot src", async () => {
        const html = `<html><head><meta name="template" content="default"></head><body><slot src="/fragment"></slot></body></html>`;

        const handler = templateHandler(
            async (req) => {
                if (new URL(req.url).pathname === '/fragment') {
                    return new Response('<html><body><p>included</p></body></html>', {
                        headers: {"content-type": "text/html"}
                    });
                }
                return new Response(html, {headers: {"content-type": "text/html"}});
            }
        );

        const response = await handler(new Request("http://test/page"));
        const text = await response.text();
        expect(text).toContain('<p>included</p>');
        expect(text).not.toContain('<slot');
    });
});
