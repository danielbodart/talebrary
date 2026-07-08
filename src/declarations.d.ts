declare module "glkote-term"
declare module "fs-xattr"

// Wasm imported as a pre-compiled module (Cloudflare CompiledWasm rule / Bun).
declare module "*.wasm" {
    const module: WebAssembly.Module
    export default module
}

declare global {
    namespace crypto {
        const DigestStream: any
    }
}