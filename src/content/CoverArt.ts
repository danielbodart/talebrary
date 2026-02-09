import type {Http} from "../http/mod.ts";
import {Uri} from "../http/Uri.ts";
import type {GameFinder} from "../games/GameFinder.ts";
import type {Dependency} from "@bodar/yadic/types.ts";
import type {WorkflowRunner} from "../workflows/mod.ts";
import type {CoverArtParams, CoverArtResult} from "../workflows/coverArt.ts";

export interface CoverArtDeps extends
    Dependency<'finder', GameFinder>,
    Dependency<'coverArtRunner', WorkflowRunner<CoverArtParams, CoverArtResult>> {
}

export function coverArt(deps: CoverArtDeps): Http {
    return async request => {
        const uri = new Uri(request.url);
        const [, , id] = uri.path.split('/');
        const game = await deps.finder.get(id);

        if (!game) return new Response('Not Found', {status: 404});

        try {
            const result = await deps.coverArtRunner.run({game});
            return new Response(result.image as any, {
                headers: {
                    'content-type': result.contentType,
                    ...(result.description ? {'description': result.description} : {}),
                    ...(result.cacheControl ? {'cache-control': result.cacheControl} : {}),
                },
            });
        } catch (e) {
            console.error('Cover art workflow failed:', e);
            return new Response(String(e), {status: 500});
        }
    };
}
