import type {Dependency} from "../yadic/mod.ts";
import {CustomElementDefinition} from "../client/components/CustomElementDefinition.ts";


export interface GridWindowDependencies extends Dependency<'HTMLElement', typeof HTMLElement> {
}

export class GridWindow {
    static definition({HTMLElement}: GridWindowDependencies) {
        return new CustomElementDefinition('grid-window', class extends HTMLElement {
            constructor() {
                super();
                console.log('GridWindow constructor');
            }

            async connectedCallback() {
                console.log('GridWindow connected');
            }
        });
    }
}
