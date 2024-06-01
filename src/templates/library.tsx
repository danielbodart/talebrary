import * as elements from "typed-html";
import {fonts} from "./fonts.tsx";

export function library(document: Document) {
    return '<!DOCTYPE html>' +
        <html lang="en">
        <head>
            <meta charset="UTF-8"/>
            {fonts()}
            <link rel="stylesheet" href="/style.css"/>
            {document.head.children}
        </head>
        <body>
        <header>
            <h1>{document.title}</h1>
        </header>
        <main>
            {document.body}
        </main>
        </body>
        </html>;
}
