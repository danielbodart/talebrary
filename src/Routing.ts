import type {BucketCachingHandler} from "./storage/BucketCachingHandler.ts";
import type {TalebraryBucket} from "./storage/TalebraryBucket.ts";
import type {ContentHandler} from "./content/ContentHandler.tsx";
import {Uri} from "./http/Uri.ts";
import type {EventHandler} from "./events/EventHandler.ts";
import type {CatalogueHandler} from "./catalogue/CatalogueHandler.tsx";
import type {Dependency} from "@bodar/yadic/types.ts";

export interface RouterDependencies extends
    Dependency<'bucket', TalebraryBucket>,
    Dependency<'catalogue', CatalogueHandler>,
    Dependency<'coverArt', BucketCachingHandler>,
    Dependency<'story', BucketCachingHandler>,
    Dependency<'content', ContentHandler>,
    Dependency<'art', BucketCachingHandler>,
    Dependency<'suggestions', BucketCachingHandler>,
    Dependency<'events', EventHandler> {}

export class Routing {
    constructor(private deps: RouterDependencies) {
    }

    // eslint-disable-next-line complexity
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

            return this.deps.catalogue.handle(request);
        }

        if (section === 'cards') {
            if (id === 'art') {
                return this.deps.art.handle(request);
            }
        }

        if(section === 'events') {
            return this.deps.events.handle(request);
        }

        // Static files (path contains file extension)
        const lastSegment = uri.path.split('/').pop() ?? '';
        if (lastSegment.includes('.')) {
            return this.deps.bucket.get(uri.path.slice(1));
        }

        // Everything else → catalogue rooms
        return this.deps.catalogue.handle(request);
    }
}
