import {get, type Http} from "../http/mod.ts";
import type {GameFinder} from "../games/GameFinder.ts";
import {Uri} from "../http/Uri.ts";
import {detectArchive, extractStory, MAX_ARCHIVE_BYTES} from "./archive.ts";

import type {Dependency} from "@bodar/yadic/types.ts";

export function story(deps: Dependency<'http', Http> & Dependency<'finder', GameFinder>): Http {
    return async request => {
        const uri = new Uri(request.url);
        const [, , id] = uri.path.split('/');
        const game = await deps.finder.get(id);
        if (!game) return new Response('Not Found', {status: 404});

        const response = await deps.http(get(game.url));
        if (!response.ok) return response;

        // Too big to buffer for extraction — pass through untouched rather than OOM.
        if (Number(response.headers.get('content-length') ?? '0') > MAX_ARCHIVE_BYTES) return response;

        const buffer = await response.arrayBuffer();
        const kind = detectArchive(new Uint8Array(buffer));
        if (!kind) return new Response(buffer, {status: 200, headers: response.headers});

        const extracted = await extractStory(new Uint8Array(buffer), kind, game.type, game.primary);
        // 404 (not ok) so BucketCachingHandler does not cache a failed extraction.
        if (!extracted) return new Response('No story file in archive', {status: 404});
        return new Response(extracted, {status: 200});
    }
}