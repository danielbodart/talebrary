import {get, type Http} from "../http/mod.ts";
import {Uri} from "../http/Uri.ts";
import type {D1GameFinder} from "../cloudflare/D1GameFinder.ts";
import {IllustrationHandler} from "./IllustrationHandler.ts";
import type {Describable, SceneContext} from "../types.ts";
import type {TalebraryAi} from "../ai/TalebraryAi.ts";
import type {TalebraryBucket} from "../storage/TalebraryBucket.ts";
import {styleTransferPrompt} from "../prompts/StyleTransferPrompt.ts";
import {detectMimeType} from "../http/DetectMimeType.ts";

import type {Dependency} from "@bodar/yadic/types.ts";

const styleTransferModel = '@cf/black-forest-labs/flux-2-klein-9b';

export interface CoverArtDeps extends Dependency<'http', Http>,
    Dependency<'finder', D1GameFinder>,
    Dependency<'illustration', IllustrationHandler>,
    Dependency<'ai', TalebraryAi>,
    Dependency<'bucket', TalebraryBucket> {
}

export function coverArt(deps: CoverArtDeps): Http {
    return async request => {
        const uri = new Uri(request.url);
        const [, , id] = uri.path.split('/');
        const game = await deps.finder.get(id);

        if (!game) return new Response('Not Found', {status: 404});

        if (game.coverart) {
            const originalResponse = await deps.http(get(game.coverart));
            if (!originalResponse.ok) return originalResponse;

            const buffer = await originalResponse.arrayBuffer();

            try {
                await deps.bucket.put(`content/${id}/cover-art-original`, buffer, {
                    contentType: originalResponse.headers.get('content-type') ?? await detectMimeType(new Uint8Array(buffer)),
                    cacheControl: 'public, max-age=31536000',
                });

                const sourceImage = Buffer.from(buffer).toString('base64');
                const prompt = styleTransferPrompt({title: game.title, description: game.description ?? ''});
                const stylized = await deps.ai.generateImage(styleTransferModel, {prompt, sourceImage});

                return new Response(stylized as any, {headers: {'content-type': await detectMimeType(stylized)}});
            } catch (e) {
                console.error('Style transfer failed, falling back to original:', e);
                return new Response(buffer, {headers: {
                    'content-type': originalResponse.headers.get('content-type') ?? await detectMimeType(new Uint8Array(buffer)),
                    'cache-control': 'no-store',
                }});
            }
        } else {
            const describable: Describable = {title: game.title, description: game.description ?? ''};
            const data: SceneContext = {story: describable, scene: describable};
            uri.query = `prompt=${encodeURIComponent(JSON.stringify(data))}`;
            return deps.illustration.handle(get(uri.toString()));
        }
    }
}