import {constructor, instance, LazyMap} from "../yadic/mod.ts";
import {SystemClock} from "../system/clock.ts";
import {ImageElement} from "../client/components/ImageElement.ts";

import {controlKeys, customElement, realise} from "../client/misc.ts";

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
        .set('ImageElement', customElement(ImageElement))
    realise(app.ImageElement);
    controlKeys(document);
})();

document.querySelector<HTMLInputElement>('input[name=title]')!.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        document.querySelector<HTMLInputElement>('input[name=description]')!.focus({preventScroll: true});
    }
});

document.querySelector<HTMLInputElement>('input[name=description]')!.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        document.querySelector<HTMLInputElement>('input[name=rules]')!.focus({preventScroll: true});
    }
});

document.querySelector<HTMLInputElement>('input[name=rules]')!.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        const form = document.querySelector<HTMLFormElement>('form')!;
        form.dispatchEvent(new SubmitEvent('submit', {cancelable: true}));
    }
});

document.querySelector<HTMLFormElement>('form')!.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = document.querySelector<HTMLFormElement>('form.input')!;
    const title = form.querySelector<HTMLInputElement>('input[name=title]')!.value;
    const description = form.querySelector<HTMLInputElement>('input[name=description]')!.value;
    const rules = form.querySelector<HTMLInputElement>('input[name=rules]')!.value;
    const model = form.querySelector<HTMLSelectElement>('select[name=model]')!.value;
    const card = document.querySelector<HTMLTemplateElement>('#card')!.content.cloneNode(true) as HTMLElement;
    const image = card.querySelector<HTMLImageElement>('.image')!;
    const query = new URLSearchParams();
    query.set('model', model);
    query.set('prompt', JSON.stringify({title, description, rules}));
    image.src += query.toString();
    image.alt = description;
    card.querySelector<HTMLDivElement>('.title')!.textContent = title;
    card.querySelector<HTMLDivElement>('.rules')!.textContent = rules;
    document.querySelector<HTMLDivElement>('.results')!.appendChild(card);
    form.reset();
    document.querySelector<HTMLInputElement>('input[name=title]')!.focus({preventScroll: true});
});

