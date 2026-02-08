import {describe, expect, test} from "bun:test";
import {processSlots} from "../../src/templates/Slot.ts";
import {parseHTML} from "linkedom";
import type {Http} from "../../src/http/mod.ts";

describe("processSlots", () => {
    const noopHttp: Http = async () => new Response('', {status: 404});

    describe("CSS selector slots", () => {
        test("extracts children of matched element", async () => {
            const {document: templateDoc} = parseHTML('<html><body><div><slot name="head"></slot></div></body></html>');
            const {document: contentDoc} = parseHTML('<html><head><title>Hello</title><meta name="x" content="y"></head><body></body></html>');

            await processSlots(templateDoc, contentDoc, noopHttp, 'http://test/');

            expect(templateDoc.querySelector('slot')).toBeNull();
            expect(templateDoc.querySelector('title')?.textContent).toBe('Hello');
            expect(templateDoc.querySelector('meta[name=x]')).not.toBeNull();
        });

        test("extracts body children", async () => {
            const {document: templateDoc} = parseHTML('<html><body><slot name="body"></slot></body></html>');
            const {document: contentDoc} = parseHTML('<html><body><main>content</main><footer>foot</footer></body></html>');

            await processSlots(templateDoc, contentDoc, noopHttp, 'http://test/');

            expect(templateDoc.querySelector('main')?.textContent).toBe('content');
            expect(templateDoc.querySelector('footer')?.textContent).toBe('foot');
        });

        test("uses CSS class selector", async () => {
            const {document: templateDoc} = parseHTML('<html><body><div><slot name=".breadcrumb"></slot></div></body></html>');
            const {document: contentDoc} = parseHTML('<html><body><div class="breadcrumb"><a>Home</a><span>Here</span></div></body></html>');

            await processSlots(templateDoc, contentDoc, noopHttp, 'http://test/');

            expect(templateDoc.querySelector('a')?.textContent).toBe('Home');
            expect(templateDoc.querySelector('span')?.textContent).toBe('Here');
            // The .breadcrumb div itself should NOT be in the template
            expect(templateDoc.querySelector('.breadcrumb')).toBeNull();
        });

        test("removes slot when no match found", async () => {
            const {document: templateDoc} = parseHTML('<html><body><slot name=".missing"></slot></body></html>');
            const {document: contentDoc} = parseHTML('<html><body><div>content</div></body></html>');

            await processSlots(templateDoc, contentDoc, noopHttp, 'http://test/');

            expect(templateDoc.querySelector('slot')).toBeNull();
        });

        test("handles multiple matches", async () => {
            const {document: templateDoc} = parseHTML('<html><body><slot name=".item"></slot></body></html>');
            const {document: contentDoc} = parseHTML('<html><body><div class="item"><span>A</span></div><div class="item"><span>B</span></div></body></html>');

            await processSlots(templateDoc, contentDoc, noopHttp, 'http://test/');

            const spans = templateDoc.querySelectorAll('span');
            expect(spans.length).toBe(2);
            expect(spans[0].textContent).toBe('A');
            expect(spans[1].textContent).toBe('B');
        });
    });

    describe("HTML includes", () => {
        test("fetches and includes content from src URL", async () => {
            const http: Http = async (req) => {
                if (new URL(req.url).pathname === '/nav') {
                    return new Response('<html><body><nav><a href="/">Home</a></nav></body></html>', {
                        headers: {'content-type': 'text/html'}
                    });
                }
                return new Response('Not Found', {status: 404});
            };

            const {document: templateDoc} = parseHTML('<html><body><slot src="/nav"></slot></body></html>');
            const {document: contentDoc} = parseHTML('<html><body></body></html>');

            await processSlots(templateDoc, contentDoc, http, 'http://test/page');

            expect(templateDoc.querySelector('nav')).not.toBeNull();
            expect(templateDoc.querySelector('a')?.textContent).toBe('Home');
            expect(templateDoc.querySelector('slot')).toBeNull();
        });

        test("removes slot on fetch failure", async () => {
            const {document: templateDoc} = parseHTML('<html><body><slot src="/missing"></slot></body></html>');
            const {document: contentDoc} = parseHTML('<html><body></body></html>');

            await processSlots(templateDoc, contentDoc, noopHttp, 'http://test/page');

            expect(templateDoc.querySelector('slot')).toBeNull();
        });

        test("resolves relative URLs against request URL", async () => {
            let capturedUrl = '';
            const http: Http = async (req) => {
                capturedUrl = req.url;
                return new Response('<p>included</p>', {headers: {'content-type': 'text/html'}});
            };

            const {document: templateDoc} = parseHTML('<html><body><slot src="fragment"></slot></body></html>');
            const {document: contentDoc} = parseHTML('<html><body></body></html>');

            await processSlots(templateDoc, contentDoc, http, 'http://test/page/');

            expect(capturedUrl).toBe('http://test/page/fragment');
        });

        test("handles absolute URL in src", async () => {
            let capturedUrl = '';
            const http: Http = async (req) => {
                capturedUrl = req.url;
                return new Response('<p>external</p>', {headers: {'content-type': 'text/html'}});
            };

            const {document: templateDoc} = parseHTML('<html><body><slot src="https://other.com/widget"></slot></body></html>');
            const {document: contentDoc} = parseHTML('<html><body></body></html>');

            await processSlots(templateDoc, contentDoc, http, 'http://test/page');

            expect(capturedUrl).toBe('https://other.com/widget');
        });
    });

    describe("slot without name or src", () => {
        test("removes unnamed slot", async () => {
            const {document: templateDoc} = parseHTML('<html><body><slot></slot><div>keep</div></body></html>');
            const {document: contentDoc} = parseHTML('<html><body></body></html>');

            await processSlots(templateDoc, contentDoc, noopHttp, 'http://test/');

            expect(templateDoc.querySelector('slot')).toBeNull();
            expect(templateDoc.querySelector('div')?.textContent).toBe('keep');
        });
    });
});
