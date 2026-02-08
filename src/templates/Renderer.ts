export type Renderer = (element: Element) => ChildNode | ChildNode[];

export interface RendererRegistry {
    [selector: string]: Renderer;
}

export function applyRenderers(document: Document, renderers: RendererRegistry): void {
    for (const [selector, renderer] of Object.entries(renderers)) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
            const result = renderer(element);
            const nodes = Array.isArray(result) ? result : [result];
            for (const node of nodes) {
                element.parentNode?.insertBefore(node, element);
            }
            element.remove();
        }
    }
}
