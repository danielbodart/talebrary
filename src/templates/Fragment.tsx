import type {CustomElementHandler} from 'typed-html';

export const Fragment: CustomElementHandler = (_attributes, contents: string[]) => {
    return contents.join('');
};