import {type HttpHandler, Uri} from "./http.ts";
import type {Librarian} from "./Librarian.ts";

export class App {
    constructor(private handler: HttpHandler, private librarian: Librarian) {
    }

    async handle(request: Request): Promise<Response> {
        const uri = new Uri(request.url);

        if (uri.path === '/librarian') {
            return this.librarian.handle(request);
        }

        if (uri.path.endsWith('/')) {
            uri.path += 'index.html';
            return this.handler(new Request(uri.toString(), request));
        }
        return this.handler(request);
    }
}