import type {CustomElementHandler} from 'typed-html';

export const Fragment: CustomElementHandler = (_attributes, contents: string[]) => {
    return contents.join('');
};

export function fragment(html: string) {
    return document.createRange().createContextualFragment(html);
}