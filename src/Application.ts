import {Ai, D1Database, type Queue, R2Bucket} from "@cloudflare/workers-types";
import {ContentSearch} from "./content/ContentSearch.tsx";
import {D1GameFinder} from "./cloudflare/D1GameFinder.ts";
import {type Http} from "./http/mod.ts";
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
import {alias, instance, constructor, LazyMap} from "./yadic/mod.ts";
import {StableDiffusion, type StableDiffusionConfig} from "./stability-ai/StableDiffusion.ts";

export interface HoneycombConfig {
    HONEYCOMB_API_KEY: string;
    HONEYCOMB_BATCH_SIZE: number;
}

export interface Config extends HoneycombConfig, StableDiffusionConfig {
}

export const DEFAULT_CONFIG = {
    HONEYCOMB_BATCH_SIZE: 50
}

export interface Env extends Config {
    db: D1Database;
    r2: R2Bucket;
    ai: Ai;
    events: Queue
}


export function application(http: Http, db: D1Database, r2: R2Bucket, digest: Digest, ai: Ai, config: Config) {
    return LazyMap.create()
        .set('STABLE_DIFFUSION_API_KEY', instance(config.STABLE_DIFFUSION_API_KEY))
        .set('HONEYCOMB_API_KEY', instance(config.HONEYCOMB_API_KEY))
        .set('HONEYCOMB_BATCH_SIZE', instance(config.HONEYCOMB_BATCH_SIZE))
        .set('db', instance(db))
        .set('http', instance(http))
        .set('r2', instance(r2))
        .set('digest', instance(digest))
        .set('ai', instance(ai))
        .set('stableDiffusion', constructor(StableDiffusion))
        .set('clock', constructor(SystemClock))
        .set('timers', constructor(SystemTimers))
        .set('honeycomb', constructor(HoneycombSender))
        .set('eventSender', alias('honeycomb'))
        .set('events', constructor(EventHandler))
        .set('finder', constructor(D1GameFinder))
        .set('search', constructor(ContentSearch))
        .set('illustration', constructor(IllustrationHandler))
        .set('coverArt', deps => new R2CachingHandler(deps, coverArt(deps)))
        .set('story', deps => new R2CachingHandler(deps, story(deps)))
        .set('art', deps => new R2CachingHandler(deps, request => deps.illustration.handle(request)))
        .set('suggestions', constructor(SuggestionsHandler))
        .decorate('suggestions', deps => new R2CachingHandler(deps, request => deps.suggestions.handle(request)))
        .set('content', constructor(ContentHandler))
        .set('handler', constructor(Routing))
        .decorate('handler', ({handler}) => templateHandler(request => handler.handle(request)))
        .decorate('handler', ({handler}) => cacheControlHandler(handler))
        .decorate('handler', ({handler, digest}) => etagHandler(digest, handler))
}