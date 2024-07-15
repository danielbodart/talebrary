import type {Dependency} from "../yadic/mod.ts";
import {CustomElementDefinition} from "../client/components/CustomElementDefinition.ts";

export interface CardCreatorDependencies extends
    Dependency<'HTMLElement', typeof HTMLElement>,
    Dependency<'CustomEvent', typeof CustomEvent>
{}

export class PlayingCard {
    static definition({HTMLElement}: CardCreatorDependencies) {
        return new CustomElementDefinition('playing-card', class extends HTMLElement {
            constructor() {
                super();
                this.querySelector('.delete')!.addEventListener('click', () => this.remove());
            }

            connectedCallback() {
                this.querySelector('textarea')!.focus()
            }
        });
    }
}
