import {parseHTML} from "linkedom";

export function roundStep(value: number, step: number = 0.5): number {
    return Math.round(value / step) * step;
}

export function wellFormed(unsafe: string | null | undefined): string {
    if (!unsafe) return ''
    const {document} = parseHTML(unsafe);
    return document.toString();
}

export function compactText(unsafe: string | null | undefined): string {
    if (!unsafe) return ''
    const {document} = parseHTML(unsafe);
    return Array.from(document.childNodes).map(e => e.textContent ?? (e as HTMLElement).innerText).join(' ').replace(/\s+/g, ' ');
}

const safeTags = new Set(['i', 'em', 'b', 'strong', 'br', 'p', 'ul', 'ol', 'li']);
const blurbPattern = /\s*\[--blurb from .+?\]\s*$/;

function sanitizeNode(node: Node, target: Node) {
    for (const child of Array.from(node.childNodes)) {
        if (child.nodeType === 3) { // Text node
            const text = child.textContent?.replace(blurbPattern, '') ?? '';
            if (text) target.appendChild(target.ownerDocument!.createTextNode(text));
        } else if (child.nodeType === 1) { // Element node
            const el = child as Element;
            const tag = el.tagName.toLowerCase();
            if (safeTags.has(tag)) {
                const safe = target.ownerDocument!.createElement(tag);
                sanitizeNode(el, safe);
                target.appendChild(safe);
            } else {
                sanitizeNode(el, target);
            }
        }
    }
}

export function safeHtml(unsafe: string | null | undefined): DocumentFragment | string {
    if (!unsafe) return '';
    const {document: parsed} = parseHTML(unsafe);
    const {document: host} = parseHTML('');
    const fragment = host.createDocumentFragment();
    sanitizeNode(parsed, fragment);
    return fragment;
}