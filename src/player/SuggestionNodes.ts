import {common, controls, directions, peopleCommands} from "../types.ts";

/**
 * A node in a suggestion tree.
 * - Group node: has `children`, drilled into (pure-CSS) — never dispatches an event.
 * - Leaf node: has `command` + `action`, dispatches the instruction event when clicked.
 */
export interface SuggestionNode {
    label: string;
    command?: string;
    action?: 'submit' | 'prefill';
    children?: SuggestionNode[];
}

function leaf(label: string, command: string, action: 'submit' | 'prefill' = 'submit'): SuggestionNode {
    return {label, command, action};
}

/**
 * Convert an AI/room command tree (verb -> nouns) into suggestion nodes.
 * - 0 nouns  -> standalone submit leaf ("look")
 * - 1 noun   -> collapsed submit leaf ("take key")
 * - 2+ nouns -> group whose leaves carry the full command ("examine" -> "examine book")
 */
export function treeToNodes(tree: Record<string, string[]>): SuggestionNode[] {
    return Object.entries(tree).map(([verb, nouns]) => {
        if (nouns.length === 0) return leaf(verb, verb);
        if (nouns.length === 1) return leaf(`${verb} ${nouns[0]}`, `${verb} ${nouns[0]}`);
        return {
            label: `${verb}…`,
            children: nouns.map(noun => leaf(noun, `${verb} ${noun}`)),
        };
    });
}

/**
 * The default, scene-independent command hierarchy shown beside the input.
 * Verb-based (not category labels): the leading verb is what lands in the input,
 * teaching vocabulary. Verbs needing a typed noun are `prefill` leaves; standalone
 * verbs `submit`; directions nest under a `go…` group.
 */
export function defaultSuggestions(): SuggestionNode[] {
    return [
        leaf('look', 'look'),
        leaf('examine', 'examine', 'prefill'),
        leaf('inventory', 'inventory'),
        {
            label: 'go…',
            children: directions.filter(d => d !== 'go').map(d => leaf(d, `go ${d}`)),
        },
        ...common.map(verb => leaf(verb, verb, 'prefill')),
        ...peopleCommands.map(verb => leaf(verb, verb, 'prefill')),
        ...controls.map(verb => leaf(verb, verb)),
    ];
}
