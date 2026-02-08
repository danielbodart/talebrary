import {type Http} from "../http/mod.ts";
import {parseHTML} from 'linkedom';
import {card} from "./card.tsx";
import {Uri} from "../http/Uri.ts";
import {defaultTemplate} from "./default.tsx";
import {type RendererRegistry, applyRenderers} from "./Renderer.ts";
import {processSlots} from "./Slot.ts";

type Template = (document: Document) => string;

const templates: { [key: string]: Template } = {
    'default': defaultTemplate,
    'card': card
}

export function templateHandler(http: Http, renderers: RendererRegistry = {}): Http {
    return async (request) => {
        const response = await http(request);
        if (!response.ok) return response;

        const contentType = response.headers.get('content-type');
        if ((contentType && contentType.includes('html')) || new Uri(request.url).path.endsWith('.html')) {
            const text = await response.text();
            const {document: contentDoc} = parseHTML(text);

            applyRenderers(contentDoc, renderers);

            const name = contentDoc.querySelector('meta[name=template]')?.getAttribute('content');
            if (!name || !(name in templates)) return new Response(contentDoc.toString(), response);

            const template = templates[name];
            const templateHtml = template(contentDoc);
            const {document: templateDoc} = parseHTML(templateHtml);

            await processSlots(templateDoc, contentDoc, http, request.url);

            return new Response(templateDoc.toString(), response)
        }

        return response;
    }
}
