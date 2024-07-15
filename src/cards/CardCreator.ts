import type {Dependency} from "../yadic/mod.ts";
import {CustomElementDefinition} from "../client/components/CustomElementDefinition.ts";


export interface CardCreatorDependencies extends
    Dependency<'HTMLElement', typeof HTMLElement> {
}

export class CardCreator {
    static definition({HTMLElement}: CardCreatorDependencies) {
        return new CustomElementDefinition('card-creator', class extends HTMLElement {
            constructor() {
                super();
                console.log('CardCreator constructor');
                this.addEventListener('click', (_) => {
                    const element = this.querySelector('template')!.content.querySelector('playing-card')!.cloneNode(true) as HTMLElement;
                    this.after(element);
                });
            }
        });
    }
}


// export interface CardCreatorDependencies extends
//     Dependency<'HTMLDivElement', typeof HTMLDivElement>,
//     Dependency<'crypto', Pick<typeof crypto, 'randomUUID'>>
// {}

// export class CardCreator {
//     static definition({HTMLDivElement}: CardCreatorDependencies) {
//         return new CustomElementDefinition('card-creator', class extends HTMLDivElement {
//             constructor() {
//                 super();
//     this.querySelector<HTMLInputElement>('input[name=title]')!.addEventListener('keyup', (event) => {
//         if (event.key === 'Enter') {
//             event.preventDefault();
//             this.querySelector<HTMLInputElement>('input[name=description]')!.focus({preventScroll: true});
//         }
//     });
//
//     this.querySelector<HTMLInputElement>('input[name=description]')!.addEventListener('keyup', (event) => {
//         if (event.key === 'Enter') {
//             event.preventDefault();
//             this.querySelector<HTMLInputElement>('input[name=rules]')!.focus({preventScroll: true});
//         }
//     });
//
//     this.querySelector<HTMLInputElement>('input[name=rules]')!.addEventListener('keyup', (event) => {
//         if (event.key === 'Enter') {
//             event.preventDefault();
//             this.dispatchEvent(new SubmitEvent('submit', {cancelable: true}));
//         }
//     });
//
//     const form = this.querySelector<HTMLFormElement>('form.input')!;
//     form.addEventListener('submit', (event) => {
//         event.preventDefault();
//         const title = this.querySelector<HTMLInputElement>('input[name=title]')!.value;
//         const description = this.querySelector<HTMLInputElement>('input[name=description]')!.value;
//         const rules = this.querySelector<HTMLInputElement>('input[name=rules]')!.value;
//         const model = this.querySelector<HTMLSelectElement>('select[name=model]')!.value;
//         const quantity = this.querySelector<HTMLSelectElement>('input[name=quantity]')!.value;
//
//         const params = this.getParamsFromLocation();
//         params.append('title', title);
//         params.append('description', description);
//         params.append('rules', rules);
//         params.append('model', model);
//         params.append('quantity', quantity);
//
//         this.createCards(title, description, rules, model, Number(quantity));
//
//         this.setParams(params);
//         form.reset();
//         this.querySelector<HTMLInputElement>('input[name=title]')!.focus({preventScroll: true});
//     });
// }

// private createCards(title: string, description: string, rules: string, model: string, quantity: number) {
//     const results = this.querySelector('.results.cards')!;
//     const uuid = crypto.randomUUID();
//     for (let i = 0; i < quantity; i++) {
//         const card = this.createCard(uuid, title, description, rules, model, quantity);
//         if (i > 0) card.classList.add('duplicate');
//         results.appendChild(card);
//     }
// }
//
// private createCard(uuid: string, title: string, description: string, rules: string, model: string, quantity: number): HTMLDivElement {
//     const fragment = this.querySelector<HTMLTemplateElement>('#card')!.content.cloneNode(true) as DocumentFragment;
//     const card = fragment.querySelector<HTMLDivElement>('.card')!;
//     card.dataset.uuid = uuid;
//     card.dataset.quantity = String(quantity);
//     const image = card.querySelector<HTMLImageElement>('.image')!;
//     const query = new URLSearchParams();
//     query.set('model', model);
//     query.set('prompt', JSON.stringify({title, description, rules}));
//     image.src += query.toString();
//     image.alt = description;
//     card.querySelector<HTMLDivElement>('.title')!.textContent = title;
//     card.querySelector<HTMLDivElement>('.rules')!.textContent = rules;
//     card.addEventListener('click', () => {
//         const data = this.extractDataFromCard(card);
//         this.setFormValues(data);
//         this.querySelectorAll(`.results.cards .card[data-uuid="${data.uuid}"]`)
//             .forEach(duplicate => duplicate.parentElement!.removeChild(duplicate));
//
//         const params = this.getParamsFromCard();
//         this.setParams(params);
//     });
//     return card;
// }
//
// private setParams(params: URLSearchParams){
//     history.pushState({}, '', `?${params.toString()}`);
// }
//
// private getParamsFromCard() {
//     return Array.from(this.querySelectorAll<HTMLDivElement>('.results.cards .card:not(.duplicate)')).map(card => this.extractDataFromCard(card))
//         .reduce((params, data) => {
//             Object.entries(data).filter(([key]) => key !== 'uuid').forEach(([key, value]) => params.append(key, value));
//             return params;
//         }, new URLSearchParams());
// }
//
// private getParamsFromLocation() {
//     return new URLSearchParams(this.ownerDocument.defaultView!.location.search);
// }
//
// connectedCallback() {
//     const params = this.getParamsFromLocation();
//     const data = Arrays.zip(params.getAll('title'), params.getAll('description'), params.getAll('rules'), params.getAll('model'), params.getAll('quantity'));
//     data.forEach(([title, description, rules, model, quantity]) => this.createCards(title, description, rules, model, Number(quantity)));
// }
//
// private extractDataFromCard(card: HTMLDivElement): CardData {
//     const image = card.querySelector<HTMLImageElement>('.image')!;
//     const params = new URLSearchParams(new URL(image.src).search);
//     return {
//         uuid: card.dataset.uuid!,
//         title: card.querySelector<HTMLDivElement>('.title')!.textContent!,
//         rules: card.querySelector<HTMLDivElement>('.rules')!.textContent!,
//         description: image.alt,
//         model: params.get('model')!,
//         quantity: Number(card.dataset.quantity),
//     }
// }
//
// private setFormValues(data: CardData) {
//     this.querySelector<HTMLInputElement>('input[name=title]')!.value = data.title;
//     this.querySelector<HTMLInputElement>('input[name=description]')!.value = data.description;
//     this.querySelector<HTMLInputElement>('input[name=rules]')!.value = data.rules;
//     this.querySelector<HTMLSelectElement>('select[name=model]')!.value = data.model;
//     this.querySelector<HTMLInputElement>('input[name=quantity]')!.value = String(data.quantity);
// }
//         }, {extends: 'div'});
//     }
// }
//
// export interface CardData {
//     uuid: string;
//     title: string;
//     description: string;
//     rules: string;
//     model: string;
//     quantity: number;
// }
