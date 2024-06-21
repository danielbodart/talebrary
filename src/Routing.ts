import type {Librarian} from "./Librarian.tsx";
import type {R2CachingHandler} from "./R2CachingHandler.ts";
import type {R2Bucket} from "@cloudflare/workers-types";
import {toResponse} from "./ToResponse.ts";
import type {ClientHandler} from "./content/ClientHandler.tsx";
import type {ArtHandler} from "./content/ArtHandler.ts";
import {Uri} from "./http/Uri.ts";


export class Routing {
    constructor(private r2: R2Bucket,
                private librarian: Librarian,
                private coverArt: R2CachingHandler,
                private story: R2CachingHandler,
                private content: ClientHandler,
                private art: ArtHandler) {
    }

    async handle(request: Request): Promise<Response> {
        const uri = new Uri(request.url);

        if (uri.path === '/librarian') {
            return this.librarian.handle(request);
        }

        if (uri.path.endsWith('/cover-art')) {
            return this.coverArt.handle(request)
        }

        if (uri.path.endsWith('/art')) {
            return this.art.handle(request);
        }

        if (uri.path.endsWith('/story')) {
            return this.story.handle(request)
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