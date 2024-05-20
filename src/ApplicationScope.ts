import {D1Database} from "@cloudflare/workers-types";
import {Librarian} from "./Librarian.tsx";
import {D1GameFinder} from "./D1GameFinder.ts";
import {type HttpHandler} from "./http.ts";
import {Routing} from "./Routing.ts";
import {htmlHandler} from "./HtmlHandler.ts";

export interface Env {
    db: D1Database;
}

export class ScopeBuilder {
    add<R = object>(fun: (scope: this) => R): this & R ;
    add<R = object>(instance: R): this & R ;
    add<R = object>(value: any): this & R {
        const result = typeof value === 'function' ? value(this) : value;
        return Object.assign(this, result);
    }
}

export function applicationScope(db: D1Database, httpClient: HttpHandler) {
    return new ScopeBuilder()
        .add({db, httpClient})
        .add(({db}) => ({finder: new D1GameFinder(db)}))
        .add(({finder}) => ({librarian: new Librarian(finder)}))
        .add(({httpClient, librarian}) => ({routing: new Routing(httpClient, librarian)}))
        .add(({routing}) => ({handler: htmlHandler(request => routing.handle(request))}))
}

export type ApplicationScope = Omit<ReturnType<typeof applicationScope>, keyof ScopeBuilder>