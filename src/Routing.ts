import type {ContentSearch} from "./content/ContentSearch.tsx";
import type {R2CachingHandler} from "./R2CachingHandler.ts";
import type {R2Bucket} from "@cloudflare/workers-types";
import {toResponse} from "./ToResponse.ts";
import type {ContentHandler} from "./content/ContentHandler.tsx";
import {Uri} from "./http/Uri.ts";
import type {DependsOn} from "./ApplicationScope.ts";
import type {EventBatcher} from "./events/EventBatcher.ts";

export interface RouterConfig extends 
    DependsOn<'r2', R2Bucket>,
    DependsOn<'search', ContentSearch>,
    DependsOn<'coverArt', R2CachingHandler>,
    DependsOn<'story', R2CachingHandler>,
    DependsOn<'content', ContentHandler>,
    DependsOn<'art', R2CachingHandler>,
    DependsOn<'suggestions', R2CachingHandler>,
    DependsOn<'events', EventBatcher> {}

export class Routing {
    constructor(private deps: RouterConfig) {
    }

    async handle(request: Request): Promise<Response> {
        const uri = new Uri(request.url);
        const [, section, id, subsection] = uri.path.split('/')

        if (section === 'content') {
            if (subsection === 'cover-art') {
                return this.deps.coverArt.handle(request);
            }

            if (subsection === 'art') {
                return this.deps.art.handle(request);
            }

            if (subsection === 'story') {
                return this.deps.story.handle(request)
            }

            if (subsection === 'suggestions') {
                return this.deps.suggestions.handle(request)
            }

            if (id) {
                return this.deps.content.handle(request);
            }

            return this.deps.search.handle(request);
        }

        if(section === 'events') {
            return this.deps.events.handle(request);
        }

        if (uri.path.endsWith('/')) {
            uri.path += 'index.html';
        }

        return toResponse(await this.deps.r2.get(uri.path.slice(1)));
    }
}