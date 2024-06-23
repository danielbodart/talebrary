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
        .add(({finder}) => ({search: new ContentSearch(finder)}))
        .add(({httpClient, r2, finder, digest, ai}) => {
            const illustration = new IllustrationHandler(ai);
            return {
                coverArt: new R2CachingHandler(r2, digest, coverArt(httpClient, finder, illustration)),
                story: new R2CachingHandler(r2, digest, story(httpClient, finder)),
                art: new R2CachingHandler(r2, digest, request => illustration.handle(request)),
                suggestions: new SuggestionsHandler(ai)
            };
        })
        .add(({finder}) => ({content: new ContentHandler(finder)}))
        .add(({
                  r2,
                  search,
                  coverArt,
                  story,
                  content,
                  art,
                  suggestions
              }) => ({routing: new Routing(r2, search, coverArt, story, content, art, suggestions)}))
        .add(({
                  routing,
                  digest
              }) => ({handler: etagHandler(digest, cacheControlHandler(templateHandler(request => routing.handle(request))))}))
}

export type ApplicationScope = Omit<ReturnType<typeof applicationScope>, keyof ScopeBuilder>