import {header} from "./header.tsx";
import {html5} from "./LinkedomHelpers.ts";

export function baseTemplate(document: Document, stylesheets: string[] = []) {
    return html5(jsx =>
        <html lang="en">
        <head>
            {header(jsx)}
            {stylesheets.map(href => <link rel="stylesheet" href={href}/>)}
            <slot name="head"></slot>
        </head>
        <body class={document.body.className} is={document.body.getAttribute('is') || ''}>
        <a class="account-link" href="/account" aria-label="Account"></a>
        <slot name="body"></slot>
        </body>
        </html>);
}
