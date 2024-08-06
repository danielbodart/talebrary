import {header} from "./header.tsx";
import {footer} from "./footer.tsx";
import {html5} from "./LinkedomHelpers.ts";

export function defaultTemplate(document: Document) {
    return html5(jsx =>
        <html lang="en">
        <head>
            {header(jsx)}
            {document.head.children}
        </head>
        <body class={document.body.className} is={document.body.getAttribute('is') || ''}>
        {document.body.children}
        {footer(jsx)}
        </body>
        </html>);
}