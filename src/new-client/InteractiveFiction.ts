import type {Dependency} from "../yadic/mod.ts";
import {CustomElementDefinition} from "../client/components/CustomElementDefinition.ts";
import type {Metrics} from "../client/types.ts";


export interface InteractiveFictionDependencies extends Dependency<'HTMLElement', typeof HTMLElement> {
}

export class InteractiveFiction {
    static definition({HTMLElement}: InteractiveFictionDependencies) {
        return new CustomElementDefinition('interactive-fiction', class extends HTMLElement {
            constructor() {
                super();
                console.log('InteractiveFiction constructor');
            }

            connectedCallback() {
                console.log('InteractiveFiction connected');
                const resizeObserver = new ResizeObserver(() => console.log(this.calculateSize()));
                resizeObserver.observe(this);
            }

            private calculateSize(): Partial<Metrics> {
                const character = this.ownerDocument.createElement('span');
                character.classList.add('character');
                character.textContent = 'M';
                this.append(character);
                const gridcharwidth = character.offsetWidth;
                const gridcharheight = character.offsetHeight;
                // character.remove();
                return {width: this.offsetWidth, height: this.offsetHeight, gridcharwidth, gridcharheight};
            }
        });
    }
}