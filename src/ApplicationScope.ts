import {D1Database, R2Bucket, Ai, CacheStorage, Cache} from "@cloudflare/workers-types";
import {Librarian} from "./Librarian.tsx";
import {D1GameFinder} from "./D1GameFinder.ts";
import {type HttpHandler} from "./http/mod.ts";
import {Routing} from "./Routing.ts";
import {templateHandler} from "./TemplateHandler.ts";
import {coverArt, R2CachingHandler, story} from "./R2CachingHandler.ts";
import {etagHandler} from "./EtagHandler.ts";
import {cacheControlHandler} from "./CacheControl.ts";
import type {Digest} from "./digest.ts";
import {ClientHandler} from "./content/ClientHandler.tsx";
import {ArtHandler} from "./content/ArtHandler.ts";
import {cacheHandler} from "./http/CacheHandler.ts";

export interface Env {
    db: D1Database;
    r2: R2Bucket;
    ai: Ai;
    caches: CacheStorage;
}

export class ScopeBuilder {
    add<R = object>(fun: (scope: this) => R): this & R ;
    add<R = object>(instance: R): this & R ;
    add<R = object>(value: any): this & R {
        const result = typeof value === 'function' ? value(this) : value;
        return Object.assign(this, result);
    }
}

export function applicationScope(db: D1Database, httpClient: HttpHandler, r2: R2Bucket, digest:Digest, ai: Ai, cache: Cache) {
    return new ScopeBuilder()
        .add({db, httpClient, r2, digest, ai, cache})
        .add(({db}) => ({finder: new D1GameFinder(db)}))
        .add(({finder}) => ({librarian: new Librarian(finder)}))
        .add(({httpClient, r2, finder}) => ({
            coverArt: new R2CachingHandler(httpClient, r2, coverArt()),
            story: new R2CachingHandler(httpClient, r2, story(finder)),
        }))
        .add(({ai}) => ({art : new ArtHandler(ai)}))
        .add(({finder}) => ({content: new ClientHandler(finder)}))
        .add(({r2, librarian, coverArt, story, content, art}) => ({routing: new Routing(r2, librarian, coverArt, story, content, art)}))
        .add(({routing, digest, cache}) => ({handler: etagHandler(digest, cacheHandler(cache, cacheControlHandler(templateHandler(request => routing.handle(request)))))}))
}

export type ApplicationScope = Omit<ReturnType<typeof applicationScope>, keyof ScopeBuilder>