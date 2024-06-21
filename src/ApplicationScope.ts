import {Ai, D1Database, R2Bucket} from "@cloudflare/workers-types";
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

export interface Env {
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

export function applicationScope(db: D1Database, httpClient: HttpHandler, r2: R2Bucket, digest: Digest, ai: Ai) {
    return new ScopeBuilder()
        .add({db, httpClient, r2, digest, ai})
        .add(({db}) => ({finder: new D1GameFinder(db)}))
        .add(({finder}) => ({librarian: new Librarian(finder)}))
        .add(({httpClient, r2, finder, digest, ai}) => ({
            coverArt: new R2CachingHandler(r2, digest, coverArt(httpClient)),
            story: new R2CachingHandler(r2, digest, story(httpClient, finder)),
            art: new R2CachingHandler(r2, digest, request => new ArtHandler(ai).handle(request)),
        }))
        .add(({finder}) => ({content: new ClientHandler(finder)}))
        .add(({
                  r2,
                  librarian,
                  coverArt,
                  story,
                  content,
                  art
              }) => ({routing: new Routing(r2, librarian, coverArt, story, content, art)}))
        .add(({
                  routing,
                  digest
              }) => ({handler: etagHandler(digest, cacheControlHandler(templateHandler(request => routing.handle(request))))}))
}

export type ApplicationScope = Omit<ReturnType<typeof applicationScope>, keyof ScopeBuilder>