import {type HttpHandler} from "./http/mod.ts";
import {parseHTML} from 'linkedom';
import {library} from "./templates/library.tsx";
import {card} from "./templates/card.tsx";
import {Uri} from "./http/Uri.ts";

type Template = (document:Document) => string;

const templates: {[key: string]: Template} = {
    'library': library,
    'card': card
}

export function templateHandler(http: HttpHandler): HttpHandler {
    return async (request) => {
        const response = await http(request);
        if (!response.ok) return response;

        const contentType = response.headers.get('content-type');
        if ((contentType && contentType.includes('html')) || new Uri(request.url).path.endsWith('.html')) {
            const {document} = parseHTML(await response.text());
            const name = document.querySelector('meta[name=template]')?.getAttribute('content');
            if (!name || !(name in templates)) return response;
            const template = templates[name];
            return new Response(template(document), response)
        }

        return response;
    }
}


