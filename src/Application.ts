import type {TalebraryAi} from "./ai/TalebraryAi.ts";
import {SqlGameFinder} from "./games/SqlGameFinder.ts";
import {type Http} from "./http/mod.ts";
import {Routing} from "./Routing.ts";
import {templateHandler} from "./templates/TemplateHandler.ts";
import {breadcrumbRenderer} from "./templates/renderers/BreadcrumbRenderer.tsx";
import type {RendererRegistry} from "./templates/Renderer.ts";
import {BucketCachingHandler} from "./storage/BucketCachingHandler.ts";
import {etagHandler} from "./http/EtagHandler.ts";
import {cacheControlHandler} from "./http/CacheControl.ts";
import type {Digest} from "./system/digest.ts";
import {ContentHandler} from "./content/ContentHandler.tsx";
import {IllustrationHandler} from "./content/IllustrationHandler.ts";
import {coverArt} from "./content/CoverArt.ts";
import {story} from "./content/Story.ts";
import {SuggestionsHandler} from "./content/SuggestionsHandler.ts";
import {SystemTimers} from "./system/timers.ts";
import {SystemClock} from "./system/clock.ts";
import {EventHandler} from "./events/EventHandler.ts";
import {CatalogueHandler} from "./catalogue/CatalogueHandler.tsx";
import {constructor, LazyMap} from "@bodar/yadic/LazyMap.ts";
import type {Dependency} from "@bodar/yadic/types.ts";
import type {TalebraryBucket} from "./storage/TalebraryBucket.ts";
import type {TalebraryDatabase} from "./database/TalebraryDatabase.ts";
import type {WorkflowRunner} from "./workflows/mod.ts";
import type {CoverArtParams, CoverArtResult} from "./workflows/coverArt.ts";
import type {IllustrationParams, IllustrationResult} from "./workflows/illustration.ts";

export interface ApplicationDependencies extends
    Dependency<'http', Http>,
    Dependency<'db', TalebraryDatabase>,
    Dependency<'bucket', TalebraryBucket>,
    Dependency<'digest', Digest>,
    Dependency<'ai', TalebraryAi>,
    Dependency<'coverArtRunner', WorkflowRunner<CoverArtParams, CoverArtResult>>,
    Dependency<'illustrationRunner', WorkflowRunner<IllustrationParams, IllustrationResult>> {
}


const renderers: RendererRegistry = {
    'script[type="application/ld+json"].breadcrumb': breadcrumbRenderer,
};

export function application(deps: ApplicationDependencies) {
    return LazyMap.create(deps)
        .set('clock', constructor(SystemClock))
        .set('timers', constructor(SystemTimers))
        .set('eventSender', _ => ({ send: async () => {} }))
        .set('events', constructor(EventHandler))
        .set('finder', constructor(SqlGameFinder))
        .set('illustration', constructor(IllustrationHandler))
        .set('coverArt', deps => new BucketCachingHandler(deps, coverArt(deps)))
        .set('story', deps => new BucketCachingHandler(deps, story(deps)))
        .set('art', deps => new BucketCachingHandler(deps, request => deps.illustration.handle(request)))
        .set('suggestions', constructor(SuggestionsHandler))
        .decorate('suggestions', deps => new BucketCachingHandler(deps, request => deps.suggestions.handle(request)))
        .set('catalogue', constructor(CatalogueHandler))
        .set('content', constructor(ContentHandler))
        .set('handler', constructor(Routing))
        .decorate('handler', ({handler}) => templateHandler(request => handler.handle(request), renderers))
        .decorate('handler', ({handler}) => cacheControlHandler(handler))
        .decorate('handler', ({handler, digest}) => etagHandler(digest, handler))
}
