export function createImageUrl({
                                   model,
                                   title,
                                   description,
                                   rules
                               }: Pick<CardData, 'model' | 'title' | 'description' | 'rules'>) {
    const query = new URLSearchParams();
    query.set('model', model);
    query.set('prompt', JSON.stringify({title, description, rules}));
    return `/cards/art?${query.toString()}`;
}

export function extractDataFromCard(card: HTMLElement): CardData {
    return {
        title: card.querySelector<HTMLDivElement>('.title')!.textContent!,
        rules: card.querySelector<HTMLDivElement>('.rules')!.textContent!,
        description: card.querySelector<HTMLTextAreaElement>('[name=description]')!.textContent!,
        model: card.querySelector<HTMLSelectElement>('[name=model]')!.value!,
        quantity: card.querySelector<HTMLDivElement>('.quantity')!.textContent!,
    }
}

export interface CardData {
    title: string;
    description: string;
    rules: string;
    model: string;
    quantity: string;
}

export function getParams(document: Document) {
    return Array.from(document.querySelectorAll<HTMLDivElement>('playing-card')).map(card => extractDataFromCard(card))
        .reduce((params, data) => {
            Object.entries(data).forEach(([key, value]) => params.append(key, value));
            return params;
        }, new URLSearchParams());
}