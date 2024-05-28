import {D1Database, R2Bucket} from "@cloudflare/workers-types";
import {Librarian} from "./Librarian.tsx";
import {D1GameFinder} from "./D1GameFinder.ts";
import {type HttpHandler} from "./http.ts";
import {Routing} from "./Routing.ts";
import {templateHandler} from "./TemplateHandler.ts";
import {CoverArtHandler} from "./CoverArtHandler.ts";
import {etagHandler} from "./EtagHandler.ts";
import {cacheHandler} from "./CacheControl.ts";
import type {Digest} from "./digest.ts";
import {ContentHandler} from "./ContentHandler.tsx";

export interface Env {
    db: D1Database;
    r2: R2Bucket;
}

export class ScopeBuilder {
    add<R = object>(fun: (scope: this) => R): this & R ;
    add<R = object>(instance: R): this & R ;
    add<R = object>(value: any): this & R {
        const result = typeof value === 'function' ? value(this) : value;
        return Object.assign(this, result);
    }
}

export function applicationScope(db: D1Database, httpClient: HttpHandler, r2: R2Bucket, digest:Digest) {
    return new ScopeBuilder()
        .add({db, httpClient, r2, digest})
        .add(({db}) => ({finder: new D1GameFinder(db)}))
        .add(({finder}) => ({librarian: new Librarian(finder)}))
        .add(({httpClient, r2}) => ({coverArt: new CoverArtHandler(httpClient, r2)}))
        .add(({finder}) => ({content: new ContentHandler(finder)}))
        .add(({r2, librarian, coverArt, content}) => ({routing: new Routing(r2, librarian, coverArt, content)}))
        .add(({routing, digest}) => ({handler: etagHandler(digest, cacheHandler(templateHandler(request => routing.handle(request))))}))
}

export type ApplicationScope = Omit<ReturnType<typeof applicationScope>, keyof ScopeBuilder>