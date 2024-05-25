import {CryptoHasher} from "bun";

export function md5(file: ArrayBuffer): string {
    const hasher = new CryptoHasher("md5");
    hasher.update(file);
    return hasher.digest('hex');
}