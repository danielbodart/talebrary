import {get, type Http} from "../http/mod.ts";
import {Uri} from "../http/Uri.ts";
import type {D1GameFinder} from "../cloudflare/D1GameFinder.ts";
import {IllustrationHandler} from "./IllustrationHandler.ts";
import type {Describable} from "../types.ts";

import type {Dependency} from "../yadic/mod.ts";


export interface CoverArtDeps extends Dependency<'http', Http>,
    Dependency<'finder', D1GameFinder>,
    Dependency<'illustration', IllustrationHandler> {
}

export function coverArt(deps: CoverArtDeps): Http {
    return async request => {
        const uri = new Uri(request.url);
        const [, , id] = uri.path.split('/');
        const game = await deps.finder.get(id);

        if (!game) return new Response('Not Found', {status: 404});

        if (game.coverart) {
            return deps.http(get(game.coverart));
        } else {
            const data: Describable = {
                title: game.title,
                description: game.description ?? '',
            };
            uri.query = `prompt=${encodeURIComponent(JSON.stringify(data))}`;
            return deps.illustration.handle(get(uri.toString()));
        }
    }
}