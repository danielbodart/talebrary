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

export type Key = string | number | symbol;

export type Dependency<K extends Key, V> = {
    [P in K]: V;
}

export interface AutoConstructor<D, T> {
    new(deps: D): T
}

export interface Constructor<T> {
    new(): T
}

export function isConstructor(func: Function): boolean {
    return !!func.prototype && func.prototype.constructor === func;
}


export class LazyMap {
    set<K extends Key, V>(key: K, fun: (deps: this) => V): this & Dependency<K, V> {
        return Object.defineProperty(this, key, {
            get: () => {
                const value = fun(this);
                this.setInstance(key, value)
                return value;
            },
            configurable: true
        }) as any;
    }

    setInstance<K extends Key, V>(key: K, value: V): this & Dependency<K, V> {
        return Object.defineProperty(this, key, {value, configurable: true}) as any;
    }

    setConstructor<K extends string, V>(key: K, valueConstructor: Constructor<V> | AutoConstructor<this, V>): this & Dependency<K, V> {
        if (!isConstructor(valueConstructor)) throw new Error(`${valueConstructor.name} is not a constructor`);
        if (valueConstructor.length === 0) { // @ts-ignore
            return this.set(key, () => new valueConstructor());
        }
        if (valueConstructor.length === 1) return this.set(key, deps => new valueConstructor(deps));
        throw new Error(`${valueConstructor.name} must take either no arguments or a dependency object. Use set() with function for other use cases`);
    }

    decorate<K extends keyof this, V>(key: K, fun: (deps: this) => V): /* Omit<this, K> */this & Dependency<K, V> {
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
        .setConstructor('clock', SystemClock)
        .setConstructor('timers', SystemTimers)
        .setConstructor('eventBatcher', EventBatcher)
        .set('events', deps => deps.eventBatcher)
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