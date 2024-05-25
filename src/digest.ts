export function hex(hashBuffer: ArrayBuffer) {
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function md5(value: ArrayBuffer) {
    return hex(await crypto.subtle.digest('MD5', value));
}

export type Digest = (a:ArrayBuffer) => Promise<string> | string;
