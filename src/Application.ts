import {Ai, D1Database, R2Bucket} from "@cloudflare/workers-types";
import {ContentSearch} from "./content/ContentSearch.tsx";
import {D1GameFinder} from "./cloudflare/D1GameFinder.ts";
import {type HttpHandler} from "./http/mod.ts";
import {Routing} from "./Routing.ts";
import {templateHandler} from "./templates/TemplateHandler.ts";
import {R2CachingHandler} from "./cloudflare/R2CachingHandler.ts";
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
import {HoneycombSender} from "./events/HoneycombSender.ts";
import {EventHandler} from "./events/EventHandler.ts";
import {LazyMap} from "./yadic/mod.ts";

export interface Config {
    HONEYCOMB_API_KEY: string;
    HONEYCOMB_BATCH_SIZE: number;
}

export const DEFAULT_CONFIG = {
    HONEYCOMB_BATCH_SIZE: 50
}

export interface Env extends Config {
    db: D1Database;
    r2: R2Bucket;
    ai: Ai;
}


export function application(http: HttpHandler, db: D1Database, r2: R2Bucket, digest: Digest, ai: Ai, config: Config) {
    return new LazyMap()
        .setInstance('HONEYCOMB_API_KEY', config.HONEYCOMB_API_KEY)
        .setInstance('HONEYCOMB_BATCH_SIZE', config.HONEYCOMB_BATCH_SIZE)
        .setInstance('db', db)
        .setInstance('http', http)
        .setInstance('r2', r2)
        .setInstance('digest', digest)
        .setInstance('ai', ai)
        .setConstructor('clock', SystemClock)
        .setConstructor('timers', SystemTimers)
        .setConstructor('honeycomb', HoneycombSender)
        .set('eventSender', deps => deps.honeycomb)
        .setConstructor('events', EventHandler)
        .setConstructor('finder', D1GameFinder)
        .setConstructor('search', ContentSearch)
        .setConstructor('illustration', IllustrationHandler)
        .set('coverArt', deps => new R2CachingHandler(deps, coverArt(deps)))
        .set('story', deps => new R2CachingHandler(deps, story(deps)))
        .set('art', deps =>
            new R2CachingHandler(deps, request => deps.illustration.handle(request)))
        .set('suggestions', deps =>
            new R2CachingHandler(deps, request => new SuggestionsHandler(ai).handle(request)))
        .set('content', ({finder}) => new ContentHandler(finder))
        .setConstructor('handler', Routing)
        .decorate('handler', ({handler}) => templateHandler(request => handler.handle(request)))
        .decorate('handler', ({handler}) => cacheControlHandler(handler))
        .decorate('handler', ({handler, digest}) => etagHandler(digest, handler))
}