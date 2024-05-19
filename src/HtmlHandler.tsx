import {type HttpHandler, Uri} from "./http.ts";
import {parseHTML} from 'linkedom';
import * as elements from 'typed-html';

export function htmlHandler(http: HttpHandler): HttpHandler {
    return async (request) => {
        const response = await http(request);
        if (!response.ok) return response;

        const contentType = response.headers.get('content-type');
        if ((contentType && contentType.includes('html')) || new Uri(request.url).path.endsWith('.html')) {
            const {document} = parseHTML(await response.text());
            return new Response(template(document), response)
        }

        return response;
    }
}

export function template(document: Document) {
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