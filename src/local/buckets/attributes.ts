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
    const encoder = new TextEncoder();
    const buffer = new Uint8Array(1024);
    const length = Number(libc.symbols.getxattr(encoder.encode(path), encoder.encode(name), buffer, buffer.length));
    if (length === -1) return;
    return new TextDecoder().decode(buffer).slice(0, length);
}

export function setAttribute(path: string, name: string, value: string): void {
    const encoder = new TextEncoder();
    const buffer = encoder.encode(value);
    const result = libc.symbols.setxattr(encoder.encode(path), encoder.encode(name), buffer, buffer.length, 0);
    if (result === -1) {
        throw new Error("Failed to set extended attribute");
    }
}