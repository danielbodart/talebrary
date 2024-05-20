import * as elements from "typed-html";

export function card(document: Document) {
    return '<!DOCTYPE html>' +
        <html lang="en">
        <head>
            <meta charset="UTF-8"/>
            <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
            <link rel="stylesheet" href="/card.css"/>
            <title>{document.title}</title>
        </head>
        <body>
        {document.body}
        </body>
        </html>;
}