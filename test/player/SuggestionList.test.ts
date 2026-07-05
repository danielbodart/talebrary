import {describe, expect, test} from "bun:test";
import {parseHTML} from "linkedom";
import {JSX2DOM} from "@bodar/jsx2dom/JSX2DOM.ts";
import {buildSuggestionList} from "../../src/player/SuggestionList.ts";
import type {SuggestionNode} from "../../src/player/SuggestionNodes.ts";

function build(nodes: SuggestionNode[]) {
    const jsx = new JSX2DOM(parseHTML('<!DOCTYPE html>'));
    return buildSuggestionList(nodes, jsx);
}

describe('buildSuggestionList', () => {
    test('a leaf renders an x-instruction carrying its command and action', () => {
        const ol = build([{label: 'look', command: 'look', action: 'submit'}]);
        const chip = ol.querySelector('li.node.leaf x-instruction')!;
        expect(chip.textContent).toBe('look');
        expect(chip.getAttribute('data-command')).toBe('look');
        expect(chip.getAttribute('data-action')).toBe('submit');
    });

    test('a prefill leaf keeps its action', () => {
        const ol = build([{label: 'examine', command: 'examine', action: 'prefill'}]);
        expect(ol.querySelector('x-instruction')!.getAttribute('data-action')).toBe('prefill');
    });

    test('a group is a self-contained label wrapping its own checkbox — no ids', () => {
        const ol = build([{
            label: 'examine…',
            children: [{label: 'book', command: 'examine book', action: 'submit'}],
        }]);
        const toggle = ol.querySelector('li.node.group > label.chip.toggle')!;
        // checkbox lives INSIDE the label, so no id/for is needed anywhere
        expect(toggle.querySelector(':scope > input.drill')).toBeTruthy();
        expect(toggle.textContent).toBe('examine…');
        expect(ol.querySelectorAll('[id]').length).toBe(0);
        expect(ol.querySelectorAll('[for]').length).toBe(0);

        const leaf = ol.querySelector('.children x-instruction')!;
        expect(leaf.getAttribute('data-command')).toBe('examine book');
    });

    test('leaf label text is set as text content (never raw HTML)', () => {
        const ol = build([{label: '<b>x</b>', command: '<b>x</b>', action: 'submit'}]);
        const chip = ol.querySelector('x-instruction')!;
        expect(chip.children.length).toBe(0);
        expect(chip.textContent).toBe('<b>x</b>');
    });
});
