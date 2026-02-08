import type {ContentSearch} from "./content/ContentSearch.tsx";
import type {BucketCachingHandler} from "./storage/BucketCachingHandler.ts";
import type {TalebraryBucket} from "./storage/TalebraryBucket.ts";
import type {ContentHandler} from "./content/ContentHandler.tsx";
import {Uri} from "./http/Uri.ts";
import type {EventHandler} from "./events/EventHandler.ts";
import type {AtriumHandler} from "./catalogue/AtriumHandler.tsx";
import type {WingHandler} from "./catalogue/WingHandler.tsx";
import type {AisleHandler} from "./catalogue/AisleHandler.tsx";
import type {Dependency} from "@bodar/yadic/types.ts";

export interface RouterDependencies extends
    Dependency<'bucket', TalebraryBucket>,
    Dependency<'search', ContentSearch>,
    Dependency<'coverArt', BucketCachingHandler>,
    Dependency<'story', BucketCachingHandler>,
    Dependency<'content', ContentHandler>,
    Dependency<'art', BucketCachingHandler>,
    Dependency<'suggestions', BucketCachingHandler>,
    Dependency<'events', EventHandler>,
    Dependency<'atrium', AtriumHandler>,
    Dependency<'wing', WingHandler>,
    Dependency<'aisle', AisleHandler> {}

export class Routing {
    constructor(private deps: RouterDependencies) {
    }

    // eslint-disable-next-line complexity
    async handle(request: Request): Promise<Response> {
        const uri = new Uri(request.url);
        const [, section, id, subsection] = uri.path.split('/')

        if (!section || (section === 'catalogue' && !id?.includes('.'))) {
            if (!id) return this.deps.atrium.handle(request);
            if (!subsection) return this.deps.wing.handle(request);
            return this.deps.aisle.handle(request);
        }

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

        if (section === 'cards') {
            if (id === 'art') {
                return this.deps.art.handle(request);
            }
        }

        if(section === 'events') {
            return this.deps.events.handle(request);
        }

        if (uri.path.endsWith('/')) {
            uri.path += 'index.html';
        }

        return this.deps.bucket.get(uri.path.slice(1));
    }
}