/// <reference path="../node_modules/@bodar/jsx2dom/src/types.d.ts" />

interface HTMLMetaElement {
    charset: string;
}

interface HTMLElement {
    is: string;
    reloadable: boolean;
}

namespace JSX {
    interface IntrinsicElements {
        'x-instruction': HtmlTag;
    }
}
