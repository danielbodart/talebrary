import {get, type HttpHandler} from "../http/mod.ts";
import type {D1GameFinder} from "../D1GameFinder.ts";
import {Uri} from "../http/Uri.ts";
import type {DependsOn} from "../ApplicationScope.ts";

export function story(deps: DependsOn<'http', HttpHandler> & DependsOn<'finder', D1GameFinder>): HttpHandler {
    return async request => {
        const uri = new Uri(request.url);
        const [, , id] = uri.path.split('/');
        const game = await deps.finder.get(id);
        return game ? deps.http(get(game.url)) : new Response('Not Found', {status: 404});
    }
}