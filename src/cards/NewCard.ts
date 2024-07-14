import type {Dependency} from "../yadic/mod.ts";
import {CustomElementDefinition} from "../client/components/CustomElementDefinition.ts";

export interface CardCreatorDependencies extends
    Dependency<'HTMLElement', typeof HTMLElement>
{}

export class NewCard {
    static definition({HTMLElement}: CardCreatorDependencies) {
        return new CustomElementDefinition('new-card', class extends HTMLElement {
            constructor() {
                super();
                console.log('NewCard constructor');
                this.addEventListener('click', (_) => {
                    const element = this.querySelector('template')!.content.querySelector('playing-card')!.cloneNode(true) as HTMLElement;
                    this.after(element);
                });
            }
        });
    }
}
