import {describe, expect, test} from "bun:test";
import {applyRenderers, type Renderer} from "../../src/templates/Renderer.ts";
import {parseHTML} from "linkedom";

describe("applyRenderers", () => {
    test("replaces matched element with renderer output", () => {
        const {document} = parseHTML(`<html><body>
            <script type="application/ld+json" class="test">{"value":"hello"}</script>
        </body></html>`);

        const renderer: Renderer = (element) => {
            const el = element.ownerDocument.createElement('div');
            el.textContent = JSON.parse(element.textContent ?? '{}').value;
            return el;
        };

        applyRenderers(document, {'script[type="application/ld+json"].test': renderer});

        expect(document.querySelector('script')).toBeNull();
        expect(document.querySelector('div')?.textContent).toBe('hello');
    });

    test("ignores elements not matching any selector", () => {
        const {document} = parseHTML(`<html><body>
            <script type="application/ld+json" class="unknown">{"value":"hello"}</script>
        </body></html>`);

        applyRenderers(document, {});

        expect(document.querySelector('script')).not.toBeNull();
    });

    test("works with any CSS selector", () => {
        const {document} = parseHTML(`<html><body>
            <div class="widget" data-type="chart">chart data</div>
        </body></html>`);

        const renderer: Renderer = (element) => {
            const el = element.ownerDocument.createElement('canvas');
            el.setAttribute('data-source', element.textContent ?? '');
            return el;
        };

        applyRenderers(document, {'div.widget[data-type="chart"]': renderer});

        expect(document.querySelector('div.widget')).toBeNull();
        expect(document.querySelector('canvas')?.getAttribute('data-source')).toBe('chart data');
    });

    test("handles multiple selectors", () => {
        const {document} = parseHTML(`<html><body>
            <script type="application/ld+json" class="alpha">{"n":1}</script>
            <script type="application/ld+json" class="beta">{"n":2}</script>
        </body></html>`);

        const renderer: Renderer = (element) => {
            const el = element.ownerDocument.createElement('span');
            el.textContent = String(JSON.parse(element.textContent ?? '{}').n);
            return el;
        };

        applyRenderers(document, {
            'script[type="application/ld+json"].alpha': renderer,
            'script[type="application/ld+json"].beta': renderer,
        });

        const spans = document.querySelectorAll('span');
        expect(spans.length).toBe(2);
        expect(spans[0].textContent).toBe('1');
        expect(spans[1].textContent).toBe('2');
    });

    test("renderer can return multiple nodes", () => {
        const {document} = parseHTML(`<html><body>
            <script type="application/ld+json" class="multi">{"items":["a","b"]}</script>
        </body></html>`);

        const renderer: Renderer = (element) => {
            return JSON.parse(element.textContent ?? '{}').items.map((item: string) => {
                const el = element.ownerDocument.createElement('span');
                el.textContent = item;
                return el;
            });
        };

        applyRenderers(document, {'script[type="application/ld+json"].multi': renderer});

        const spans = document.querySelectorAll('span');
        expect(spans.length).toBe(2);
        expect(spans[0].textContent).toBe('a');
        expect(spans[1].textContent).toBe('b');
    });
});
