import {CryptoHasher} from "bun";

export function md5(array: ArrayBuffer): string {
    const hasher = new CryptoHasher("md5");
    hasher.update(array);
    return hasher.digest('hex');
}