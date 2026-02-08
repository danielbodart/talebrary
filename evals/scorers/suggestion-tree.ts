import {commands, directions} from "../../src/types.ts";
import type {EvalCase, Score} from "../types.ts";
import type {Describable} from "../../src/types.ts";

export function validTree(output: any): Score {
    if (!output?.tree || typeof output.tree !== 'object' || Array.isArray(output.tree)) {
        return {name: "valid-tree", value: 0, reason: "tree field missing or not an object"};
    }
    const entries = Object.entries(output.tree);
    if (entries.length === 0) return {name: "valid-tree", value: 0, reason: "tree is empty"};

    const invalid = entries.filter(([, v]) => !Array.isArray(v));
    if (invalid.length > 0) {
        return {
            name: "valid-tree",
            value: (entries.length - invalid.length) / entries.length,
            reason: `non-array values: ${invalid.map(([k]) => k).join(", ")}`,
        };
    }
    return {name: "valid-tree", value: 1};
}

export function verbsFromList(output: any): Score {
    if (!output?.tree || typeof output.tree !== 'object') {
        return {name: "verbs-from-list", value: 0, reason: "no tree"};
    }
    const verbs = Object.keys(output.tree);
    if (verbs.length === 0) return {name: "verbs-from-list", value: 0, reason: "empty tree"};

    const valid = verbs.filter(v => commands.includes(v));
    return {
        name: "verbs-from-list",
        value: valid.length / verbs.length,
        reason: valid.length === verbs.length
            ? undefined
            : `not in list: ${verbs.filter(v => !commands.includes(v)).join(", ")}`,
    };
}

export function nounsFromScene(output: any, evalCase: EvalCase<Describable>): Score {
    if (!output?.tree || typeof output.tree !== 'object') {
        return {name: "nouns-from-scene", value: 0, reason: "no tree"};
    }
    const allNouns = Object.values(output.tree as Record<string, string[]>).flat();
    if (allNouns.length === 0) return {name: "nouns-from-scene", value: 1}; // no nouns to validate

    const description = evalCase.input.description.toLowerCase();
    const valid = allNouns.filter(n =>
        description.includes(n.toLowerCase()) || directions.includes(n.toLowerCase())
    );
    return {
        name: "nouns-from-scene",
        value: valid.length / allNouns.length,
        reason: valid.length === allNouns.length
            ? undefined
            : `not in scene: ${[...new Set(allNouns.filter(n => !description.includes(n.toLowerCase()) && !directions.includes(n.toLowerCase())))].join(", ")}`,
    };
}

export function treeSize(output: any): Score {
    if (!output?.tree || typeof output.tree !== 'object') {
        return {name: "tree-size", value: 0, reason: "no tree"};
    }
    const tree = output.tree as Record<string, string[]>;
    const verbCount = Object.keys(tree).length;
    const nounCount = Object.values(tree).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
    const total = verbCount + nounCount;

    // Diminishing returns: approaches 1 asymptotically
    // At 5 items: ~0.50, at 10: ~0.67, at 20: ~0.80, at 50: ~0.91
    const k = 0.1;
    const value = 1 - 1 / (1 + total * k);
    return {
        name: "tree-size",
        value: Math.round(value * 1000) / 1000,
        reason: `${verbCount} verbs, ${nounCount} nouns (${total} total)`,
    };
}

export function treeDepth(output: any): Score {
    if (!output?.tree || typeof output.tree !== 'object') {
        return {name: "tree-depth", value: 0, reason: "no tree"};
    }
    const tree = output.tree as Record<string, string[]>;
    const entries = Object.entries(tree);
    if (entries.length === 0) return {name: "tree-depth", value: 0, reason: "empty tree"};

    const withChildren = entries.filter(([, v]) => Array.isArray(v) && v.length > 1);
    return {
        name: "tree-depth",
        value: withChildren.length / entries.length,
        reason: `${withChildren.length}/${entries.length} verbs have multiple completions`,
    };
}
