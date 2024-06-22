import {get, type HttpHandler} from "../http/mod.ts";
import type {D1GameFinder} from "../D1GameFinder.ts";
import {Uri} from "../http/Uri.ts";

export function story(http: HttpHandler, d1: D1GameFinder): HttpHandler {
    return async request => {
        const uri = new Uri(request.url);
        const [, , id] = uri.path.split('/');
        const game = await d1.get(id);
        return game ? http(get(game.url)) : new Response('Not Found', {status: 404});
    }
}