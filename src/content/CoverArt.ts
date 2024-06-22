import {get, type HttpHandler} from "../http/mod.ts";
import {Uri} from "../http/Uri.ts";
import type {D1GameFinder} from "../D1GameFinder.ts";
import {IllustrationHandler} from "./IllustrationHandler.ts";
import type {Describable} from "../types.ts";

export function coverArt(http: HttpHandler, d1: D1GameFinder, illustration: IllustrationHandler): HttpHandler {
    return async request => {
        const uri = new Uri(request.url);
        const [, , id] = uri.path.split('/');
        const game = await d1.get(id);

        if (!game) return new Response('Not Found', {status: 404});

        if (game.coverart) {
            return http(get(game.coverart));
        } else {
            const data: Describable = {
                title: game.title,
                description: game.description ?? '',
            };
            uri.query = `prompt=${encodeURIComponent(JSON.stringify(data))}`;
            return illustration.handle(get(uri.toString()));
        }
    }
}