import {Uri} from "./http.ts";
import type {Librarian} from "./Librarian.tsx";
import type {CoverArtHandler} from "./CoverArtHandler.ts";
import type {R2Bucket} from "@cloudflare/workers-types";
import {toResponse} from "./ToResponse.ts";
import type {ContentHandler} from "./ContentHandler.tsx";


export class Routing {
    constructor(private r2: R2Bucket,
                private librarian: Librarian,
                private coverArt: CoverArtHandler,
                private content: ContentHandler) {
    }

    async handle(request: Request): Promise<Response> {
        const uri = new Uri(request.url);

        if (uri.path === '/librarian') {
            return this.librarian.handle(request);
        }

        if (uri.path.endsWith('/cover-art')) {
            return this.coverArt.handler(request)
        }

        if (uri.path.startsWith('/content/')) {
            return this.content.handle(request)
        }

        if (uri.path.endsWith('/')) {
            uri.path += 'index.html';
        }

        return toResponse(await this.r2.get(uri.path.slice(1)));
    }
}