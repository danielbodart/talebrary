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
import {EventBatcher} from "./events/EventBatcher.ts";

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

export type DependsOn<K extends string | number | symbol, V> = {
    [P in K]: V;
}

export class LazyMap {
    set<K extends string, V>(key: K, fun: (deps: this) => V): this & DependsOn<K, V> {
        return Object.defineProperty(this, key, {
            get: () => {
                const value = fun(this);
                this.setInstance(key, value)
                return value;
            },
            configurable: true
        }) as any;
    }

    setInstance<K extends string, V>(key: K, value: V): this & DependsOn<K, V> {
        return Object.defineProperty(this, key, {value, configurable: true}) as any;
    }

    decorate<K extends keyof this, V>(key: K, fun: (deps: this) => V): /* Omit<this, K> */this & DependsOn<K, V> {
        const p = Object.getOwnPropertyDescriptor(this, key);
        if (!p) throw new Error(`No previous key for '${String(key)}' found`);
        delete this[key];
        return this.set(String(key), deps => {
            Object.defineProperty(deps, key, p);
            return fun(deps)
        }) as any;
    }
}

export function applicationScope(http: HttpHandler, db: D1Database, r2: R2Bucket, digest: Digest, ai: Ai, config: Config) {
    return new LazyMap()
        .setInstance('HONEYCOMB_API_KEY', config.HONEYCOMB_API_KEY)
        .setInstance('HONEYCOMB_BATCH_SIZE', config.HONEYCOMB_BATCH_SIZE)
        .setInstance('db', db)
        .setInstance('http', http)
        .setInstance('r2', r2)
        .setInstance('digest', digest)
        .setInstance('ai', ai)
        .setInstance('clock', new SystemClock())
        .set('timers', ({clock}) => new SystemTimers(clock))
        .set('events', deps => new EventBatcher(deps))
        .set('finder', ({db}) => new D1GameFinder(db))
        .set('search', ({finder}) => new ContentSearch(finder))
        .set('illustration', ({ai}) => new IllustrationHandler(ai))
        .set('coverArt', deps => new R2CachingHandler(deps, coverArt(deps)))
        .set('story', deps => new R2CachingHandler(deps, story(deps)))
        .set('art', deps =>
            new R2CachingHandler(deps, request => deps.illustration.handle(request)))
        .set('suggestions', deps =>
            new R2CachingHandler(deps, request => new SuggestionsHandler(ai).handle(request)))
        .set('content', ({finder}) => new ContentHandler(finder))
        .set('handler', deps => new Routing(deps))
        .decorate('handler', ({handler}) => templateHandler(request => handler.handle(request)))
        .decorate('handler', ({handler}) => cacheControlHandler(handler))
        .decorate('handler', ({handler, digest}) => etagHandler(digest, handler))
}