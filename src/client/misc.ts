import type {CustomElementDefinition} from "./components/CustomElementDefinition.ts";

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