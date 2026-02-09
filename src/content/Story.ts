import {get, type Http} from "../http/mod.ts";
import type {GameFinder} from "../games/GameFinder.ts";
import {Uri} from "../http/Uri.ts";

import type {Dependency} from "@bodar/yadic/types.ts";

export function story(deps: Dependency<'http', Http> & Dependency<'finder', GameFinder>): Http {
    return async request => {
        const uri = new Uri(request.url);
        const [, , id] = uri.path.split('/');
        const game = await deps.finder.get(id);
        return game ? deps.http(get(game.url)) : new Response('Not Found', {status: 404});
    }
}