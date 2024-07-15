import {type Http} from "../http/mod.ts";
import {parseHTML} from 'linkedom';
import {card} from "./card.tsx";
import {Uri} from "../http/Uri.ts";
import {defaultTemplate} from "./default.tsx";

type Template = (document: Document) => string;

const templates: { [key: string]: Template } = {
    'default': defaultTemplate,
    'card': card
}

export function templateHandler(http: Http): Http {
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


