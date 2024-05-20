import * as elements from "typed-html";

export function library(document: Document) {
    return '<!DOCTYPE html>' +
        <html lang="en">
        <head>
            <meta charset="UTF-8"/>
            <title>{document.title}</title>
            <link rel="preconnect" href="https://fonts.googleapis.com"/>
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="crossorigin"/>
            <link
                href="https://fonts.googleapis.com/css2?family=League+Spartan:wght@700&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap"
                rel="stylesheet"/>
            <link rel="stylesheet" href="/style.css"/>
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
