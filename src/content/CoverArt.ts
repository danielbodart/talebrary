import type {Http} from "../http/mod.ts";
import {Uri} from "../http/Uri.ts";
import type {GameFinder} from "../games/GameFinder.ts";
import type {TalebraryBucket} from "../storage/TalebraryBucket.ts";
import type {Dependency} from "@bodar/yadic/types.ts";
import type {WorkflowRunner} from "../workflows/mod.ts";
import type {CoverArtParams, CoverArtResult} from "../workflows/coverArt.ts";

export interface CoverArtDeps extends
    Dependency<'finder', GameFinder>,
    Dependency<'bucket', TalebraryBucket>,
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
            const image = await deps.bucket.get(result.bucketKey);
            if (!image.ok) return new Response('Image not found', {status: 500});
            return new Response(image.body, {
                headers: {
                    'content-type': result.contentType,
                    ...(result.description ? {'description': result.description} : {}),
                    ...(result.cacheControl ? {'cache-control': result.cacheControl} : {}),
                    ...(result.errors?.length ? {'x-cover-art-errors': result.errors.join(' | ')} : {}),
                },
            });
        } catch (e) {
            console.error('Cover art workflow failed:', e);
            return new Response(String(e), {status: 500});
        }
    };
}
