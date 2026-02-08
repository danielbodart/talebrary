import {describe, expect, test} from "bun:test";
import {breadcrumbRenderer} from "../../src/templates/renderers/BreadcrumbRenderer.tsx";
import {parseHTML} from "linkedom";

function scriptElement(document: Document, data: object): Element {
    const script = document.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    script.setAttribute('class', 'breadcrumb');
    script.textContent = JSON.stringify(data);
    document.body.appendChild(script);
    return script;
}

describe("breadcrumbRenderer", () => {
    test("renders breadcrumb with links and current item", () => {
        const {document} = parseHTML('<html><body></body></html>');
        const element = scriptElement(document, {
            '@type': 'BreadcrumbList',
            itemListElement: [
                {'@type': 'ListItem', position: 1, name: 'Atrium', item: '/catalogue'},
                {'@type': 'ListItem', position: 2, name: 'Genre Wings', item: '/catalogue/genres'},
                {'@type': 'ListItem', position: 3, name: 'Fantasy'},
            ]
        });

        const result = breadcrumbRenderer(element) as HTMLElement;
        document.body.appendChild(result);

        expect(result.className).toBe('breadcrumb');
        const links = document.querySelectorAll('a');
        expect(links.length).toBe(2);
        expect(links[0].getAttribute('href')).toBe('/catalogue');
        expect(links[0].textContent).toBe('Atrium');
        expect(links[1].getAttribute('href')).toBe('/catalogue/genres');
        expect(links[1].textContent).toBe('Genre Wings');

        const current = document.querySelector('.current');
        expect(current?.textContent).toBe('Fantasy');

        const seps = document.querySelectorAll('.sep');
        expect(seps.length).toBe(2);
    });

    test("sorts by position", () => {
        const {document} = parseHTML('<html><body></body></html>');
        const element = scriptElement(document, {
            '@type': 'BreadcrumbList',
            itemListElement: [
                {'@type': 'ListItem', position: 3, name: 'Last'},
                {'@type': 'ListItem', position: 1, name: 'First', item: '/first'},
                {'@type': 'ListItem', position: 2, name: 'Middle', item: '/middle'},
            ]
        });

        const result = breadcrumbRenderer(element) as HTMLElement;
        const children = result.querySelectorAll('a, .current');
        expect(children[0].textContent).toBe('First');
        expect(children[1].textContent).toBe('Middle');
        expect(children[2].textContent).toBe('Last');
    });

    test("renders single item as current", () => {
        const {document} = parseHTML('<html><body></body></html>');
        const element = scriptElement(document, {
            '@type': 'BreadcrumbList',
            itemListElement: [
                {'@type': 'ListItem', position: 1, name: 'Atrium'},
            ]
        });

        const result = breadcrumbRenderer(element) as HTMLElement;

        expect(result.querySelectorAll('a').length).toBe(0);
        expect(result.querySelectorAll('.sep').length).toBe(0);
        expect(result.querySelector('.current')?.textContent).toBe('Atrium');
    });

    test("last item without href is current even if others have no href", () => {
        const {document} = parseHTML('<html><body></body></html>');
        const element = scriptElement(document, {
            '@type': 'BreadcrumbList',
            itemListElement: [
                {'@type': 'ListItem', position: 1, name: 'First', item: '/first'},
                {'@type': 'ListItem', position: 2, name: 'Last'},
            ]
        });

        const result = breadcrumbRenderer(element) as HTMLElement;

        expect(result.querySelectorAll('a').length).toBe(1);
        expect(result.querySelector('.current')?.textContent).toBe('Last');
    });
});
