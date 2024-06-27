import type {
    Blob,
    Headers,
    R2Checksums,
    R2HTTPMetadata,
    R2ObjectBody,
    R2Range,
    ReadableStream
} from "@cloudflare/workers-types";
import {type BunFile} from "bun";
import {Strings} from "./Strings.ts";

export class FileObject implements R2ObjectBody {
    constructor(public key: string,
                private file: BunFile,
                public httpMetadata: R2HTTPMetadata = {},
                public etag: string = '',
                private response: Response = new Response(file.stream())) {
        if (!this.httpMetadata.contentType) this.httpMetadata.contentType = file.type;
    }

    get body(): ReadableStream<any> {
        return this.response.body as any;
    }

    get bodyUsed(): boolean {
        return this.response.bodyUsed;
    }

    arrayBuffer(): Promise<ArrayBuffer> {
        return this.response.arrayBuffer();
    }

    text(): Promise<string> {
        return this.response.text();
    }

    json<T>(): Promise<T> {
        return this.response.json();
    }

    blob(): Promise<Blob> {
        return this.response.blob() as any;
    }

    version: string = '1';

    get size(): number {
        return this.file.size;
    }

    get httpEtag(): string {
        // Strong Etag
        return `"${this.etag}"`;
    }

    get checksums(): R2Checksums {
        throw new Error("Method not implemented.");
    }

    get uploaded(): Date {
        throw new Error("Method not implemented.");
    }

    customMetadata?: Record<string, string> | undefined;
    range?: R2Range | undefined;
    storageClass: string = '';

    writeHttpMetadata(headers: Headers): void {
        if (!this.httpMetadata) return;
        for (const [key, value] of Object.entries(this.httpMetadata)) {
            if (value) headers.set(Strings.kebabCase(key), value);
        }
    }
}