import {type HttpHandler, Uri} from "./http.ts";
import type {D1GameFinder} from "./D1GameFinder.ts";

export class App {
    constructor(private handler: HttpHandler, private finder: D1GameFinder) {
    }

    async handle(request: Request): Promise<Response> {
        const uri = new Uri(request.url);

        if (uri.path === '/search') {
            const result = await this.finder.find(uri.query ?? '');
            return new Response(JSON.stringify(result))
        }

        if (uri.path.endsWith('/')) {
            uri.path += 'index.html';
            return this.handler(new Request(uri.toString(), request));
        }
        return this.handler(request);
    }
}