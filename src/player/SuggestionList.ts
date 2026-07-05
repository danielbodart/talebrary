import {JSX2DOM, type SupportedElement} from "@bodar/jsx2dom/JSX2DOM.ts";
import type {SuggestionNode} from "./SuggestionNodes.ts";

/**
 * Build a suggestion panel as semantic nested lists.
 *
 * Drill-in / sibling-hiding is pure CSS: a group's chip is a `<label>` wrapping
 * its own hidden checkbox (no ids — fully self-contained). Horizontal paging and
 * the unified back/forward arrows are added by SuggestionCarousel.ts; leaf
 * `<x-instruction>`s fire the instruction event. Works both server-side (pass a
 * linkedom-backed JSX2DOM) and client-side (defaults to the global document), so
 * player and catalogue share one builder.
 */
export function buildSuggestionList(nodes: SuggestionNode[], jsx: JSX2DOM = new JSX2DOM()): SupportedElement {
    return jsx.createElement('ol', {class: 'suggestions level'}, nodes.map(node => renderNode(jsx, node)));
}

function renderNode(jsx: JSX2DOM, node: SuggestionNode): SupportedElement {
    if (node.children) {
        const toggle = jsx.createElement('label', {class: 'chip toggle'},
            jsx.createElement('input', {type: 'checkbox', class: 'drill'}),
            node.label);
        const children = jsx.createElement('ol', {class: 'level children'},
            node.children.map(child => renderNode(jsx, child)));
        return jsx.createElement('li', {class: 'node group'}, toggle, children);
    }
    return jsx.createElement('li', {class: 'node leaf'},
        jsx.createElement('x-instruction', {
            class: 'chip',
            'data-command': node.command ?? node.label,
            'data-action': node.action ?? 'submit',
        }, node.label));
}
