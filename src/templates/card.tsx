import * as elements from "typed-html";
import {fonts} from "./fonts.tsx";

export function card(document: Document) {
    return '<!DOCTYPE html>' +
        <html lang="en">
        <head>
            <meta charset="UTF-8"/>
            <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
            {fonts()}
            <link rel="stylesheet" href="/card.css"/>
            {document.head.children}
        </head>
        <body>
        {document.body.innerHTML}
        <script defer="defer" src='https://static.cloudflareinsights.com/beacon.min.js'
                data-cf-beacon='{"token": "0318e83ff0164f35bdddaae3db8ec304"}'></script>
        </body>
        </html>;
}