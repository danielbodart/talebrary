import {describe, expect, test} from "bun:test";
import {collapseSuggestions, treeToSuggestions} from "../../src/player/PrefixTree.ts";

describe('collapseSuggestions', () => {
    test('single-word suggestions pass through unchanged', () => {
        const result = collapseSuggestions(['inventory', 'look']);
        expect(result).toEqual([
            {text: 'inventory', completions: []},
            {text: 'look', completions: []},
        ]);
    });

    test('multi-word suggestion with unique prefix stays as-is', () => {
        const result = collapseSuggestions(['take key']);
        expect(result).toEqual([
            {text: 'take key', completions: []},
        ]);
    });

    test('multi-word suggestions with shared prefix collapse into prefix...', () => {
        const result = collapseSuggestions(['examine book', 'examine lamp', 'examine desk']);
        expect(result).toEqual([
            {text: 'examine...', completions: ['book', 'lamp', 'desk']},
        ]);
    });

    test('mixed single and multi-word suggestions', () => {
        const result = collapseSuggestions([
            'examine book', 'examine lamp', 'go east', 'go west', 'take key', 'inventory'
        ]);
        expect(result).toEqual([
            {text: 'examine...', completions: ['book', 'lamp']},
            {text: 'go...', completions: ['east', 'west']},
            {text: 'take key', completions: []},
            {text: 'inventory', completions: []},
        ]);
    });

    test('single word that matches a prefix group is excluded', () => {
        const result = collapseSuggestions(['examine', 'examine book', 'examine lamp']);
        expect(result).toEqual([
            {text: 'examine...', completions: ['book', 'lamp']},
        ]);
    });

    test('single word with no matching group is kept', () => {
        const result = collapseSuggestions(['inventory', 'examine book', 'examine lamp']);
        expect(result).toEqual([
            {text: 'examine...', completions: ['book', 'lamp']},
            {text: 'inventory', completions: []},
        ]);
    });

    test('empty input returns empty output', () => {
        expect(collapseSuggestions([])).toEqual([]);
    });
});

describe('treeToSuggestions', () => {
    test('standalone verb with empty array', () => {
        expect(treeToSuggestions({inventory: [], look: []})).toEqual([
            {text: 'inventory', completions: []},
            {text: 'look', completions: []},
        ]);
    });

    test('verb with single noun shows full command', () => {
        expect(treeToSuggestions({take: ['key']})).toEqual([
            {text: 'take key', completions: []},
        ]);
    });

    test('verb with multiple nouns collapses with ...', () => {
        expect(treeToSuggestions({examine: ['book', 'lamp', 'desk']})).toEqual([
            {text: 'examine...', completions: ['book', 'lamp', 'desk']},
        ]);
    });

    test('mixed tree with standalone and expandable entries', () => {
        expect(treeToSuggestions({
            examine: ['book', 'lamp'],
            go: ['east', 'west'],
            take: ['key'],
            inventory: [],
        })).toEqual([
            {text: 'examine...', completions: ['book', 'lamp']},
            {text: 'go...', completions: ['east', 'west']},
            {text: 'take key', completions: []},
            {text: 'inventory', completions: []},
        ]);
    });

    test('empty tree returns empty output', () => {
        expect(treeToSuggestions({})).toEqual([]);
    });
});
