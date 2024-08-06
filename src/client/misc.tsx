import {type BufferImage, isLineData, type LineData} from "./types.ts";
import {wordCount} from "../system/Strings.ts";
import type {CustomElementDefinition} from "./components/CustomElementDefinition.ts";
import type {Elements} from "../templates/elements.ts";

export function cleanLineData(content: (LineData | BufferImage)[]): LineData[] {
    return content.filter<LineData>(isLineData).map(line => {
        return {
            ...line,
            text: line.text.trim()
        }
    }).filter(line => {
        return line.text !== '' && line.text !== '>';
    });
}

export function instructions(elements: Elements, line: LineData, maxLength: number = 4) {
    // TODO
    // if (line.style === 'normal') {
    //     return line.text.replace(capitalWords, match => match.length >= 3 && wordCount(match) <= maxLength ?
    //         <x-instruction>{match}</x-instruction> : match);
    // }
    if (line.style === "header" || line.style === 'subheader' || line.style === 'emphasized') {
        if (wordCount(line.text) <= maxLength) {
            return <x-instruction>{line.text}</x-instruction>
        }
    }
    return line.text;
}

export function group(elements: Elements, html: DocumentFragment, classes: string[]) {
    const chunks = splitWhen(Array.from(html.children), (e: Element) => {
        return e.previousElementSibling instanceof HTMLElement && (e.previousElementSibling.classList.contains('normal') || e.previousElementSibling.classList.contains('input')) &&
            e instanceof HTMLElement && (e.classList.contains('header') || e.classList.contains('subheader')) &&
            e.nextElementSibling instanceof HTMLElement && e.nextElementSibling.classList.contains('normal');
    });
    return chunks.map(chunk => <div class={classes.join(' ')}>{chunk}</div>);
}

export function splitWhen<T>(values: T[], predicate: (t: T) => boolean): T[][] {
    const result: T[][] = [];
    let current: T[] = [];
    for (const value of values) {
        if (predicate(value)) {
            result.push(current);
            current = [];
        }
        current.push(value);
    }
    result.push(current);
    return result;
}

export function customElement<D, C extends CustomElementConstructor>(value: {
    definition: (deps: D) => CustomElementDefinition<C>
}) {
    return (deps: D & { customElements: CustomElementRegistry }) => value.definition(deps).apply(deps.customElements);
}

export function realise(...args: any[]) {
    return args;
}

export function controlKeys(document: Document) {
    ['keydown', 'keyup'].forEach(event => document.addEventListener(event as 'keydown' | 'keyup', (e: KeyboardEvent) => {
        document.body.classList.toggle('ctrl', e.ctrlKey);
        document.body.classList.toggle('alt', e.altKey);
        document.body.classList.toggle('shift', e.shiftKey);
        document.body.classList.toggle('meta', e.metaKey);
    }));
}