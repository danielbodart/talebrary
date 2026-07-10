import type {BucketCachingHandler} from "./storage/BucketCachingHandler.ts";
import type {Http} from "./http/mod.ts";
import type {ContentHandler} from "./content/ContentHandler.tsx";
import {Uri} from "./http/Uri.ts";
import type {EventHandler} from "./events/EventHandler.ts";
import type {CatalogueHandler} from "./catalogue/CatalogueHandler.tsx";
import type {SitemapHandler} from "./sitemap/SitemapHandler.ts";
import type {RobotsHandler} from "./sitemap/RobotsHandler.ts";
import type {Auth} from "./auth/Auth.ts";
import type {AuthHandler} from "./auth/AuthHandler.tsx";
import type {Dependency} from "@bodar/yadic/types.ts";

export interface RouterDependencies extends
    Dependency<'assets', Http>,
    Dependency<'catalogue', CatalogueHandler>,
    Dependency<'coverArt', BucketCachingHandler>,
    Dependency<'story', BucketCachingHandler>,
    Dependency<'content', ContentHandler>,
    Dependency<'art', BucketCachingHandler>,
    Dependency<'suggestions', BucketCachingHandler>,
    Dependency<'sitemap', SitemapHandler>,
    Dependency<'robots', RobotsHandler>,
    Dependency<'auth', Auth>,
    Dependency<'authHandler', AuthHandler>,
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

        if (section === 'api' && id === 'auth') {
            return this.deps.auth.handle(request);
        }

        if (section === 'login' || section === 'account' || section === 'logout') {
            return this.deps.authHandler.handle(request);
        }

        if (section === 'sitemap.xml') {
            return this.deps.sitemap.handle(request);
        }

        if (section === 'robots.txt') {
            return this.deps.robots.handle(request);
        }

        // Static files (path contains file extension). In production these are
        // served by the Workers Static Assets layer before the Worker runs; this
        // fallthrough only fires for the template-processed HTML (run_worker_first)
        // and for the Bun local runtime, where `assets` is backed by FolderBucket.
        const lastSegment = uri.path.split('/').pop() ?? '';
        if (lastSegment.includes('.')) {
            return this.deps.assets(request);
        }

        // Everything else → catalogue rooms
        return this.deps.catalogue.handle(request);
    }
}
