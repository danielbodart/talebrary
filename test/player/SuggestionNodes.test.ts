import {describe, expect, test} from "bun:test";
import {defaultSuggestions, treeToNodes} from "../../src/player/SuggestionNodes.ts";
import {common, controls, directions, peopleCommands} from "../../src/types.ts";

describe('treeToNodes', () => {
    test('standalone verb (0 nouns) becomes a submit leaf', () => {
        expect(treeToNodes({inventory: [], look: []})).toEqual([
            {label: 'inventory', command: 'inventory', action: 'submit'},
            {label: 'look', command: 'look', action: 'submit'},
        ]);
    });

    test('single noun collapses into a submit leaf', () => {
        expect(treeToNodes({take: ['key']})).toEqual([
            {label: 'take key', command: 'take key', action: 'submit'},
        ]);
    });

    test('multiple nouns become a group whose leaves carry the full command', () => {
        expect(treeToNodes({examine: ['book', 'lamp', 'desk']})).toEqual([
            {
                label: 'examine…',
                children: [
                    {label: 'book', command: 'examine book', action: 'submit'},
                    {label: 'lamp', command: 'examine lamp', action: 'submit'},
                    {label: 'desk', command: 'examine desk', action: 'submit'},
                ],
            },
        ]);
    });

    test('mixed tree preserves order and shapes', () => {
        expect(treeToNodes({
            examine: ['book', 'lamp'],
            go: ['east', 'west'],
            take: ['key'],
            inventory: [],
        })).toEqual([
            {
                label: 'examine…',
                children: [
                    {label: 'book', command: 'examine book', action: 'submit'},
                    {label: 'lamp', command: 'examine lamp', action: 'submit'},
                ],
            },
            {
                label: 'go…',
                children: [
                    {label: 'east', command: 'go east', action: 'submit'},
                    {label: 'west', command: 'go west', action: 'submit'},
                ],
            },
            {label: 'take key', command: 'take key', action: 'submit'},
            {label: 'inventory', command: 'inventory', action: 'submit'},
        ]);
    });

    test('empty tree returns empty output', () => {
        expect(treeToNodes({})).toEqual([]);
    });
});

describe('defaultSuggestions', () => {
    const nodes = defaultSuggestions();
    const byLabel = (label: string) => nodes.find(n => n.label === label);

    test('look and inventory are submit leaves', () => {
        expect(byLabel('look')).toEqual({label: 'look', command: 'look', action: 'submit'});
        expect(byLabel('inventory')).toEqual({label: 'inventory', command: 'inventory', action: 'submit'});
    });

    test('examine is a prefill leaf (needs a typed noun)', () => {
        expect(byLabel('examine')).toEqual({label: 'examine', command: 'examine', action: 'prefill'});
    });

    test('go… is a group of every direction except "go", each a submit leaf', () => {
        const go = byLabel('go…');
        expect(go?.children).toEqual(
            directions.filter(d => d !== 'go').map(d => ({label: d, command: `go ${d}`, action: 'submit'})),
        );
    });

    test('common and people verbs are prefill leaves', () => {
        for (const verb of [...common, ...peopleCommands]) {
            expect(byLabel(verb)).toEqual({label: verb, command: verb, action: 'prefill'});
        }
    });

    test('controls are submit leaves', () => {
        for (const verb of controls) {
            expect(byLabel(verb)).toEqual({label: verb, command: verb, action: 'submit'});
        }
    });

    test('only go… is a group; every other entry is a leaf', () => {
        expect(nodes.filter(n => n.children).map(n => n.label)).toEqual(['go…']);
    });
});
