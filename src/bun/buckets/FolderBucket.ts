import {file} from "bun";
import {setAttribute, getAttribute} from "./attributes.ts";
import {Strings} from "./Strings.ts";
import {md5} from "../digest.ts";
import {mkdir} from "node:fs/promises";
import {dirname} from "node:path";
import type {TalebraryBucket, PutOptions} from "../../storage/TalebraryBucket.ts";

export class FolderBucket implements TalebraryBucket {
    constructor(private root: string) {
    }

    async get(key: string, options?: { onlyIf?: { etagDoesNotMatch?: string } }): Promise<Response> {
        const data = file(`${this.root}${key}`);
        if (!await data.exists()) return new Response('Not Found', {status: 404});

        const headers = new Headers();
        const contentType = getAttribute(data.name!, 'user.content-type') ?? data.type;
        if (contentType) headers.set('content-type', contentType);

        const cacheControl = getAttribute(data.name!, 'user.cache-control');
        if (cacheControl) headers.set('cache-control', cacheControl);

        const description = getAttribute(data.name!, 'user.description');
        if (description) headers.set('description', description);

        const etag = await this.getOrComputeEtag(data);
        headers.set('etag', etag);

        if (options?.onlyIf?.etagDoesNotMatch && options.onlyIf.etagDoesNotMatch === etag) {
            return new Response(null, {status: 304, headers});
        }

        return new Response(data.stream(), {status: 200, headers});
    }

    async put(key: string, value: ArrayBuffer | Uint8Array | string, options?: PutOptions): Promise<void> {
        const path = `${this.root}${key}`;
        await mkdir(dirname(path), {recursive: true});

        const data = file(path);
        const writer = data.writer();
        writer.write(value as any);
        await writer.flush();

        const hash = md5(await data.arrayBuffer());
        setAttribute(data.name!, 'user.etag', hash);

        if (options?.contentType) {
            setAttribute(data.name!, 'user.content-type', options.contentType);
        }
        if (options?.cacheControl) {
            setAttribute(data.name!, 'user.cache-control', options.cacheControl);
        }
        if (options?.customMetadata) {
            for (const [k, v] of Object.entries(options.customMetadata)) {
                setAttribute(data.name!, `user.${Strings.kebabCase(k)}`, v);
            }
        }
    }

    private async getOrComputeEtag(data: import("bun").BunFile): Promise<string> {
        const cached = getAttribute(data.name!, 'user.etag');
        if (cached) return `"${cached}"`;
        const hash = md5(await data.arrayBuffer());
        setAttribute(data.name!, 'user.etag', hash);
        return `"${hash}"`;
    }
}
