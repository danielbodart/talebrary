import type {Dependency} from "../../src/yadic/mod.ts";

export class Elements {
    constructor(private deps: Dependency<'document', Document>) {
    }

    createElement(name: string, attributes?: { [key: string]: string } | null, ...contents: any[]): HTMLElement {
        const document = this.deps.document;
        const element = document.createElement(name);

        for (const [key, value] of Object.entries(attributes || {})) {
            element.setAttribute(key, value);
        }

        for (const content of contents) {
            element.appendChild(typeof content === 'string' ? document.createTextNode(content) : content);
        }

        return element;
    }
}


