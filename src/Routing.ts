import {type HttpHandler, Uri} from "./http.ts";
import type {Librarian} from "./Librarian.tsx";
import type {CoverArtHandler} from "./CoverArtHandler.ts";


export class Routing {
    constructor(private httpClient: HttpHandler, private librarian: Librarian, private coverArt: CoverArtHandler) {
    }

    async handle(request: Request): Promise<Response> {
        const uri = new Uri(request.url);

        if (uri.path === '/librarian') {
            return this.librarian.handle(request);
        }

        if (uri.path.endsWith('/cover-art')) {
            return this.coverArt.handler(request)
        }

        if (uri.path.endsWith('/')) {
            uri.path += 'index.html';
            return this.httpClient(new Request(uri.toString(), request));
        }
        return this.httpClient(request);
    }
}