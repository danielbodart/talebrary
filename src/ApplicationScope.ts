import {Ai, D1Database, R2Bucket} from "@cloudflare/workers-types";
import {ContentSearch} from "./content/ContentSearch.tsx";
import {D1GameFinder} from "./D1GameFinder.ts";
import {type HttpHandler} from "./http/mod.ts";
import {Routing} from "./Routing.ts";
import {templateHandler} from "./TemplateHandler.ts";
import {R2CachingHandler} from "./R2CachingHandler.ts";
import {etagHandler} from "./EtagHandler.ts";
import {cacheControlHandler} from "./CacheControl.ts";
import type {Digest} from "./digest.ts";
import {ContentHandler} from "./content/ContentHandler.tsx";
import {IllustrationHandler} from "./content/IllustrationHandler.ts";
import {coverArt} from "./content/CoverArt.ts";
import {story} from "./content/Story.ts";
import {SuggestionsHandler} from "./content/SuggestionsHandler.ts";
import {SystemTimers} from "./timers.ts";
import {SystemClock} from "./clock.ts";
import {HoneycombSender} from "./events/HoneycombSender.ts";

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

export class ScopeBuilder {
    add<R = object>(fun: (scope: this) => R): this & R ;
    add<R = object>(instance: R): this & R ;
    add<R = object>(value: any): this & R {
        const result = typeof value === 'function' ? value(this) : value;
        return Object.assign(this, result);
    }
}

export type DependsOn<K extends string, T> = {
    [P in K]: T;
}

export function applicationScope(db: D1Database, http: HttpHandler, r2: R2Bucket, digest: Digest, ai: Ai, config: Config) {
    return new ScopeBuilder()
        .add({db, http, r2, digest, ai, ...config})
        .add({clock: new SystemClock()})
        .add(({clock}) => ({timers: new SystemTimers(clock)}))
        .add((deps) => ({events: new HoneycombSender(deps)}))
        .add(({db}) => ({finder: new D1GameFinder(db)}))
        .add(({finder}) => ({search: new ContentSearch(finder)}))
        .add(({http, r2, finder, digest, ai}) => {
            const illustration = new IllustrationHandler(ai);
            return {
                coverArt: new R2CachingHandler(r2, digest, coverArt(http, finder, illustration)),
                story: new R2CachingHandler(r2, digest, story(http, finder)),
                art: new R2CachingHandler(r2, digest, request => illustration.handle(request)),
                suggestions: new R2CachingHandler(r2, digest, request => new SuggestionsHandler(ai).handle(request))
            };
        })
        .add(({finder}) => ({content: new ContentHandler(finder)}))
        .add((deps) => ({routing: new Routing(deps)}))
        .add(({
                  routing,
                  digest
              }) => ({handler: etagHandler(digest, cacheControlHandler(templateHandler(request => routing.handle(request))))}))
}

export type ApplicationScope = Omit<ReturnType<typeof applicationScope>, keyof ScopeBuilder>