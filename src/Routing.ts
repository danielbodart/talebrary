import type {ContentSearch} from "./content/ContentSearch.tsx";
import type {R2CachingHandler} from "./R2CachingHandler.ts";
import type {R2Bucket} from "@cloudflare/workers-types";
import {toResponse} from "./ToResponse.ts";
import type {ContentHandler} from "./content/ContentHandler.tsx";
import {Uri} from "./http/Uri.ts";


export class Routing {
    constructor(private r2: R2Bucket,
                private librarian: ContentSearch,
                private coverArt: R2CachingHandler,
                private story: R2CachingHandler,
                private content: ContentHandler,
                private art: R2CachingHandler) {
    }

    async handle(request: Request): Promise<Response> {
        const uri = new Uri(request.url);
        const [, section, id, subsection] = uri.path.split('/')

        if (section === 'content') {
            if (subsection === 'cover-art') {
                return this.coverArt.handle(request);
            }

            if (subsection === 'art') {
                return this.art.handle(request);
            }

            if (subsection === 'story') {
                return this.story.handle(request)
            }

            if (id) {
                return this.content.handle(request);
            }

            return this.librarian.handle(request);
        }

        if (uri.path.endsWith('/')) {
            uri.path += 'index.html';
        }

        return toResponse(await this.r2.get(uri.path.slice(1)));
    }
}