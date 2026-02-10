import type {TalebraryBucket, PutOptions} from "../src/storage/TalebraryBucket.ts";

export function stubBucket(): TalebraryBucket {
    const store = new Map<string, { body: Uint8Array; contentType?: string }>();
    return {
        get: async (key) => {
            const item = store.get(key);
            if (!item) return new Response(null, {status: 404});
            return new Response(item.body as any, {
                headers: {'content-type': item.contentType ?? 'application/octet-stream'},
            });
        },
        put: async (key, value, options?: PutOptions) => {
            const body = value instanceof Uint8Array ? value
                : typeof value === 'string' ? new TextEncoder().encode(value)
                : new Uint8Array(value);
            store.set(key, {body, contentType: options?.contentType});
        },
    };
}
