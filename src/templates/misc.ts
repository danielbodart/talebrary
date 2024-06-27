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