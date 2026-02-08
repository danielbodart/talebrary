import {type Http} from "../http/mod.ts";
import type {TalebraryBucket} from "./TalebraryBucket.ts";
import type {Digest} from "../system/digest.ts";
import type {Dependency} from "@bodar/yadic/types.ts";
import {detectMimeType} from "../http/DetectMimeType.ts";

export interface BucketCachingHandlerDeps extends Dependency<'bucket', TalebraryBucket>,
    Dependency<'digest', Digest> {
}

export class BucketCachingHandler {
    constructor(private deps: BucketCachingHandlerDeps, private http: Http) {
    }

    async handle(request: Request): Promise<Response> {
        const {pathname: path, searchParams} = new URL(request.url);
        const reload = searchParams.has('reload');
        if (reload) searchParams.delete('reload');
        const query = searchParams.toString();
        const key = path.substring(1) + (query ? `/${await this.deps.digest(new TextEncoder().encode(query).buffer)}` : '')

        if (reload) {
            console.log('Force reload', key);
        } else {
            try {
                const oldEtag = request.headers.get('if-none-match');
                const response = await this.deps.bucket.get(key, oldEtag ? {onlyIf: {etagDoesNotMatch: oldEtag}} : undefined);
                if (response.status !== 404) {
                    console.log('Found in cache', key, response.status);
                    return response;
                }
            } catch (e) {
                console.error(e);
            }

            console.log('Not found in cache', key);
        }

        const response = await this.http(request);
        if (!response.ok) return response;
        if (response.headers.get('cache-control') === 'no-store') return response;

        const buffer = await response.arrayBuffer();
        try {
            await this.deps.bucket.put(key, buffer, {
                contentType: response.headers.get('content-type') ?? (await detectMimeType(new Uint8Array(buffer))),
                cacheControl: 'public, max-age=60',
                customMetadata: {
                    description: response.headers.get('description') ?? ''
                }
            });
            console.log("Uploaded to cache", key);
        } catch (e) {
            console.error("Error uploading to cache", e);
        }
        return new Response(buffer, {status: 200, headers: response.headers});
    }
}
