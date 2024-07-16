export function createImageUrl({
                                   model,
                                   title,
                                   description,
                                   rules
                               }: Pick<CardData, 'model' | 'title' | 'description' | 'rules'>, reload?: string) {
    const query = new URLSearchParams();
    query.set('model', model);
    query.set('prompt', JSON.stringify({title, description, rules}));
    if (reload) query.set('reload', reload);
    return `/cards/art?${query.toString()}`;
}

export function extractDataFromCard(card: HTMLElement): CardData {
    return {
        description: card.querySelector<HTMLTextAreaElement>('[name=description]')!.value!,
        model: card.querySelector<HTMLSelectElement>('[name=model]')!.value!,
        title: card.querySelector<HTMLDivElement>('.title')!.textContent!,
        rules: card.querySelector<HTMLDivElement>('.rules')!.textContent!,
        quantity: card.querySelector<HTMLDivElement>('.quantity')!.textContent!,
    }
}

export interface CardData {
    description: string;
    model: string;
    title: string;
    rules: string;
    quantity: string;
}

export function getParams(document: Document) {
    return Array.from(document.querySelectorAll<HTMLDivElement>('playing-card')).map(card => extractDataFromCard(card))
        .reduce((params, data) => {
            Object.entries(data).forEach(([key, value]) => params.append(key, value));
            return params;
        }, new URLSearchParams());
}