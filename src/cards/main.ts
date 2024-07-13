import {constructor, type Dependency, instance, LazyMap} from "../yadic/mod.ts";
import {SystemClock} from "../system/clock.ts";
import {ImageElement} from "../client/components/ImageElement.ts";

import {controlKeys, customElement, realise} from "../client/misc.ts";
import {CustomElementDefinition} from "../client/components/CustomElementDefinition.ts";
import {Arrays} from "../system/Arrays.ts";

interface AppDependencies extends Dependency<'HTMLFormElement', typeof HTMLFormElement> {

}

class CardCreator {
    static definition({HTMLFormElement}: AppDependencies) {
        return new CustomElementDefinition('card-creator', class extends HTMLFormElement {
            constructor() {
                super();
                this.querySelector<HTMLInputElement>('input[name=title]')!.addEventListener('keyup', (event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        this.querySelector<HTMLInputElement>('input[name=description]')!.focus({preventScroll: true});
                    }
                });

                this.querySelector<HTMLInputElement>('input[name=description]')!.addEventListener('keyup', (event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        this.querySelector<HTMLInputElement>('input[name=rules]')!.focus({preventScroll: true});
                    }
                });

                this.querySelector<HTMLInputElement>('input[name=rules]')!.addEventListener('keyup', (event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        this.dispatchEvent(new SubmitEvent('submit', {cancelable: true}));
                    }
                });

                this.addEventListener('submit', (event) => {
                    event.preventDefault();
                    const title = this.querySelector<HTMLInputElement>('input[name=title]')!.value;
                    const description = this.querySelector<HTMLInputElement>('input[name=description]')!.value;
                    const rules = this.querySelector<HTMLInputElement>('input[name=rules]')!.value;
                    const model = this.querySelector<HTMLSelectElement>('select[name=model]')!.value;
                    const quantity = Number(this.querySelector<HTMLSelectElement>('input[name=quantity]')!.value);

                    const params = this.getParams();
                    params.append('title', title);
                    params.append('description', description);
                    params.append('rules', rules);
                    params.append('model', model);
                    params.append('quantity', String(quantity));

                    this.ownerDocument.defaultView!.location.search = params.toString();
                });
            }

            private createCards(title: string, description: string, rules: string, model: string, quantity: number) {
                const results = this.ownerDocument.querySelector('.results.cards')!;
                for (let i = 0; i < quantity; i++) {
                    const card = this.createCard(title, description, rules, model);
                    if (i > 0) card.querySelector('.card')!.classList.add('duplicate');
                    results.appendChild(card);
                }
            }

            private createCard(title: string, description: string, rules: string, model: string): DocumentFragment {
                const card = this.ownerDocument.querySelector<HTMLTemplateElement>('#card')!.content.cloneNode(true) as DocumentFragment;
                const image = card.querySelector<HTMLImageElement>('.image')!;
                const query = new URLSearchParams();
                query.set('model', model);
                query.set('prompt', JSON.stringify({title, description, rules}));
                image.src += query.toString();
                image.alt = description;
                card.querySelector<HTMLDivElement>('.title')!.textContent = title;
                card.querySelector<HTMLDivElement>('.rules')!.textContent = rules;
                return card;
            }

            private getParams() {
                return new URLSearchParams(this.ownerDocument.defaultView!.location.search);
            }

            connectedCallback() {
                const params = this.getParams();
                const data = Arrays.zip(params.getAll('title'), params.getAll('description'), params.getAll('rules'), params.getAll('model'), params.getAll('quantity'));
                data.forEach(([title, description, rules, model, quantity]) => this.createCards(title, description, rules, model, Number(quantity)));
            }
        }, {extends: 'form'});
    }
}


(async () => {
    const app = LazyMap.create()
        .set('window', instance(window))
        .set('storage', instance(window.localStorage))
        .set('document', instance(document))
        .set('clock', constructor(SystemClock))
        .set('http', instance(fetch))
        .set('logger', instance(console))
        .set('customElements', instance(window.customElements))
        .set('CustomEvent', instance(CustomEvent))
        .set('HTMLElement', instance(HTMLElement))
        .set('HTMLImageElement', instance(HTMLImageElement))
        .set('HTMLFormElement', instance(HTMLFormElement))
        .set('ImageElement', customElement(ImageElement))
        .set('CardCreator', customElement(CardCreator))
    realise(app.ImageElement, app.CardCreator);
    controlKeys(document);
})();
