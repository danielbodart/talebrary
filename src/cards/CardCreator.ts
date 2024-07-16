import type {Dependency} from "../yadic/mod.ts";
import {CustomElementDefinition} from "../client/components/CustomElementDefinition.ts";
import {Arrays} from "../system/Arrays.ts";
import {type CardData, createImageUrl} from "./shared.ts";


export interface CardCreatorDependencies extends Dependency<'HTMLElement', typeof HTMLElement> {
}

export class CardCreator {
    static definition({HTMLElement}: CardCreatorDependencies) {
        return new CustomElementDefinition('card-creator', class extends HTMLElement {
            constructor() {
                super();
                this.addEventListener('click', (_) => {
                    this.before(this.newCard());
                });
                this.ownerDocument.defaultView!.addEventListener('popstate', e => {
                    console.log('popstate', e.state);
                    this.createCards();
                })
            }

            connectedCallback() {
                this.createCards();
            }

            private newCard() {
                return this.querySelector('template')!.content.querySelector('playing-card')!.cloneNode(true) as HTMLElement;
            }

            private createCards() {
                this.ownerDocument.querySelectorAll('playing-card').forEach(card => card.remove());
                const params = this.getParamsFromLocation();
                const data = Arrays.zip(params.getAll('title'), params.getAll('description'), params.getAll('rules'), params.getAll('model'), params.getAll('quantity'));
                data.forEach(([title, description, rules, model, quantity]) =>
                    this.before(this.createCard({title, description, rules, model, quantity})));
            }

            private getParamsFromLocation() {
                return new URLSearchParams(this.ownerDocument.defaultView!.location.search);
            }

            private createCard({title, description, rules, model, quantity}: CardData): HTMLElement {
                const card = this.newCard()
                const image = card.querySelector<HTMLImageElement>('.image')!;
                image.src = createImageUrl({model, title, description, rules});
                image.alt = description;
                card.querySelector<HTMLTextAreaElement>('textarea[name=description]')!.textContent = description;
                card.querySelector<HTMLDivElement>('.title')!.textContent = title;
                card.querySelector<HTMLDivElement>('.rules')!.textContent = rules;
                card.querySelector<HTMLDivElement>('.quantity')!.textContent = quantity;
                return card;
            }
        });
    }
}