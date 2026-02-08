import type {Http} from "../http/mod.ts";
import {parseHTML} from "linkedom";

const MAX_DEPTH = 10;

export async function processSlots(templateDoc: Document, contentDoc: Document, http: Http, requestUrl: string): Promise<void> {
    for (let depth = 0; depth < MAX_DEPTH; depth++) {
        const slots = templateDoc.querySelectorAll('slot');
        if (slots.length === 0) return;
        for (const slot of slots) {
            const src = slot.getAttribute('src');
            if (src) {
                await processInclude(slot, src, http, requestUrl);
            } else {
                const name = slot.getAttribute('name');
                if (name) processSelector(slot, name, contentDoc);
                else slot.remove();
            }
        }
    }
}

function processSelector(slot: Element, selector: string, contentDoc: Document): void {
    const matches = contentDoc.querySelectorAll(selector);
    for (const match of matches) {
        for (const child of [...match.childNodes]) {
            slot.parentNode?.insertBefore(child, slot);
        }
    }
    slot.remove();
}

async function processInclude(slot: Element, src: string, http: Http, requestUrl: string): Promise<void> {
    const resolvedUrl = new URL(src, requestUrl).toString();
    const response = await http(new Request(resolvedUrl));
    if (!response.ok) {
        slot.remove();
        return;
    }
    const text = await response.text();
    const {document: includeDoc} = parseHTML(text);
    const children = includeDoc.body.childNodes.length > 0
        ? [...includeDoc.body.childNodes]
        : [...includeDoc.childNodes];
    for (const child of children) {
        slot.parentNode?.insertBefore(child, slot);
    }
    slot.remove();
}
