import * as elements from "typed-html";
import {fonts} from "./fonts.tsx";

export function defaultTemplate(document: Document) {
    return '<!DOCTYPE html>' +
        <html lang="en">
        <head>
            <meta charset="UTF-8"/>
            <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
            {fonts()}
            <link rel="stylesheet" href="/src/client/main.css"/>
            {document.head.children}
        </head>
        <body>
        {document.body}
        </body>
        </html>;
}