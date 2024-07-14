import * as elements from "typed-html";
import {header} from "./header.tsx";
import {footer} from "./footer.tsx";

export function defaultTemplate(document: Document) {
    return '<!DOCTYPE html>' +
        <html lang="en">
        <head>
            {header}
            {document.head.children}
        </head>
        <body class={document.body.className} is={document.body.getAttribute('is') || ''}>
        {document.body.innerHTML}
        {footer}
        </body>
        </html>;
}