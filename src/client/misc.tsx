import {type BufferImage, isLineData, type LineData} from "./types.ts";
import {capitalWords, wordCount} from "../system/Strings.ts";
import type {CustomElementDefinition} from "./components/CustomElementDefinition.ts";
import type {JSX2DOM} from "../jsx2dom/JSX2DOM.ts";

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

export function instructions(jsx: JSX2DOM, line: LineData, maxLength: number = 4) {
    if (line.style === 'normal') {
        return replace(capitalWords, line.text, match => match.toString().length >= 3 && wordCount(match.toString()) <= maxLength ?
            <x-instruction>{match}</x-instruction> : match);
    }
    if (line.style === "header" || line.style === 'subheader' || line.style === 'emphasized') {
        if (wordCount(line.text) <= maxLength) {
            return <x-instruction>{line.text}</x-instruction>
        }
    }
    return line.text;
}

export function replace<A>(regex: RegExp, value: string, replacer: (match: RegExpExecArray) => A): (A | string)[];
export function replace<A, B>(regex: RegExp, value: string, replacer: (match: RegExpExecArray) => A, nonMatchedReplacer: (a: string) => B): (A | B)[];
export function replace<A, B>(regex: RegExp, value: string, replacer: (match: RegExpExecArray) => A, nonMatchedReplacer: (a: string) => any = (value) => value): (A | B)[] {
    const result: (A | B)[] = [];

    let position = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(value)) != null) {
        result.push(nonMatchedReplacer(value.substring(position, match.index)));
        result.push(replacer(match));
        position = regex.lastIndex;
    }
    result.push(nonMatchedReplacer(value.substring(position)));

    return result;
}


export function group(jsx: JSX2DOM, html: HTMLElement[], classes: string[]) {
    // TODO work out why this is needed
    const works = Array.from((<>{html}</>).children);
    const chunks = splitWhen(works, (e: Element) => {
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