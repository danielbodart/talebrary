import {type HttpHandler, Uri} from "./http.ts";
import {parseHTML} from 'linkedom';

export function htmlHandler(http: HttpHandler): HttpHandler {
    return async (request) => {
        const response = await http(request);
        if (!response.ok) return response;

        const contentType = response.headers.get('content-type');
        if ((contentType && contentType.includes('html')) || new Uri(request.url).path.endsWith('.html')) {
            const {document} = parseHTML(await response.text());
            const name = document.querySelector('meta[name=template]')?.getAttribute('content');
            if (!name) return response;
            const {template} = await import(`./templates/${name}.tsx`);
            return new Response(template(document), response)
        }

        return response;
    }
}


