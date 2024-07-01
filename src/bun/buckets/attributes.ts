import {dlopen, FFIType} from "bun:ffi";

const libc = dlopen(`libc.so.6`, {
    getxattr: {
        args: [FFIType.cstring, FFIType.cstring, FFIType.ptr, FFIType.u64],
        returns: FFIType.i64,
    },
    setxattr: {
        args: [FFIType.cstring, FFIType.cstring, FFIType.ptr, FFIType.u64, FFIType.int],
        returns: FFIType.int,
    },
});

export function getAttribute(path: string, name: string): string | undefined {
    const buffer = new Uint8Array(1024);
    const length = Number(libc.symbols.getxattr(toCString(path), toCString(name), buffer, buffer.length));
    if (length === -1) return;
    return new TextDecoder().decode(buffer).slice(0, length);
}

export enum SetAttributeOptions {
    None = 0,
    /**
     * Set value, fail if attr already exists
     */
    Create = 1,
    /**
     * Set value, fail if attr does not exist
     */
    Replace = 2
}

export function setAttribute(path: string, name: string, value: string, options: SetAttributeOptions = SetAttributeOptions.None): void {
    const buffer = new TextEncoder().encode(value);
    const result = libc.symbols.setxattr(toCString(path), toCString(name), buffer, buffer.length, options);
    if (result === -1) {
        throw new Error("Failed to set extended attribute");
    }
}

export function toCString(value: string): Uint8Array {
    return new TextEncoder().encode(value + '\0');
}
