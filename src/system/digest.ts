export function hex(hashBuffer: ArrayBufferLike) {
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function md5(value: ArrayBufferLike) {
    return hex(await crypto.subtle.digest('MD5', value as any));
}

export type Digest = (a:ArrayBufferLike) => Promise<string> | string;
