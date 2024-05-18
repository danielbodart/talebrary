import {type HttpHandler, Uri} from "./http.ts";
import type {Librarian} from "./Librarian.tsx";


export class Routing {
    constructor(private httpClient: HttpHandler, private librarian: Librarian ) {
    }

    async handle(request: Request): Promise<Response> {
        const uri = new Uri(request.url);

        if (uri.path === '/librarian') {
            return this.librarian.handle(request);
        }

        if (uri.path.endsWith('/')) {
            uri.path += 'index.html';
            return this.httpClient(new Request(uri.toString(), request));
        }
        return this.httpClient(request);
    }
}