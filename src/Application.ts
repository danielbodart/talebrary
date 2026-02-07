import type {Ai, D1Database, R2Bucket} from "@cloudflare/workers-types";
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
import {EventHandler} from "./events/EventHandler.ts";
import {AtriumHandler} from "./catalogue/AtriumHandler.tsx";
import {WingHandler} from "./catalogue/WingHandler.tsx";
import {AisleHandler} from "./catalogue/AisleHandler.tsx";
import {constructor, LazyMap} from "@bodar/yadic/LazyMap.ts";
import type {Dependency} from "@bodar/yadic/types.ts";

export interface ApplicationDependencies extends
    Dependency<'http', Http>,
    Dependency<'db', D1Database>,
    Dependency<'r2', R2Bucket>,
    Dependency<'digest', Digest>,
    Dependency<'ai', Ai> {
}


export function application(deps: ApplicationDependencies) {
    return LazyMap.create(deps)
        .set('clock', constructor(SystemClock))
        .set('timers', constructor(SystemTimers))
        .set('eventSender', _ => ({ send: async () => {} }))
        .set('events', constructor(EventHandler))
        .set('finder', constructor(D1GameFinder))
        .set('search', constructor(ContentSearch))
        .set('illustration', constructor(IllustrationHandler))
        .set('coverArt', deps => new R2CachingHandler(deps, coverArt(deps)))
        .set('story', deps => new R2CachingHandler(deps, story(deps)))
        .set('art', deps => new R2CachingHandler(deps, request => deps.illustration.handle(request)))
        .set('suggestions', constructor(SuggestionsHandler))
        .decorate('suggestions', deps => new R2CachingHandler(deps, request => deps.suggestions.handle(request)))
        .set('atrium', constructor(AtriumHandler))
        .set('wing', constructor(WingHandler))
        .set('aisle', constructor(AisleHandler))
        .set('content', constructor(ContentHandler))
        .set('handler', constructor(Routing))
        .decorate('handler', ({handler}) => templateHandler(request => handler.handle(request)))
        .decorate('handler', ({handler}) => cacheControlHandler(handler))
        .decorate('handler', ({handler, digest}) => etagHandler(digest, handler))
}
