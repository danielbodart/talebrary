import type {
    Blob,
    Headers,
    R2Bucket,
    R2Conditional,
    R2GetOptions,
    R2ListOptions,
    R2MultipartOptions,
    R2MultipartUpload,
    R2Object,
    R2ObjectBody,
    R2Objects,
    R2PutOptions,
    ReadableStream
} from "@cloudflare/workers-types";
import {file} from "bun";
import {setAttribute} from "./attributes.ts";
import {FileObject} from "./FileObject.ts";
import {Strings} from "./Strings.ts";
import {getHttpEtag, getHttpMetadata} from "./GetHttpMetadata.ts";

export class FolderBucket implements R2Bucket {
    constructor(private root: string) {
    }

    head(_key: string): Promise<R2Object | null> {
        throw new Error("Method not implemented.");
    }

    get(key: string, options: R2GetOptions & {
        onlyIf: R2Conditional | Headers;
    }): Promise<R2Object | R2ObjectBody | null>;
    get(key: string, options?: R2GetOptions | undefined): Promise<R2ObjectBody | null>;
    async get(key: string, _options?: any): Promise<any> {
        const data = file(`${this.root}${key}`);
        if (!await data.exists()) return null;
        return new FileObject(key, data, getHttpMetadata(data), await getHttpEtag(data));
    }

    put(key: string, value: string | ReadableStream<any> | ArrayBuffer | ArrayBufferView | Blob | null, options?: (R2PutOptions & {
        onlyIf: R2Conditional | Headers;
    }) | undefined): Promise<R2Object | null>;
    put(key: string, value: string | ReadableStream<any> | ArrayBuffer | ArrayBufferView | Blob | null, options?: R2PutOptions | undefined): Promise<R2Object>;
    async put(key: string, value: string | ReadableStream<any> | ArrayBuffer | ArrayBufferView | Blob | null, options?: any): Promise<any> {
        if (!value) return null;
        const data = file(`${this.root}${key}`);
        const writer = data.writer();
        switch (typeof value) {
            case "string": {
                writer.write(value);
                break;
            }
            case "object": {
                if ('getReader' in value && typeof value.getReader === 'function') {
                    const reader = value.getReader();
                    for (let result = await reader.read(); !result.done; result = await reader.read()) {
                        writer.write(result.value);
                    }
                }
                throw new Error("Unsupported value");
            }
            default:
                throw new Error("Unsupported value");
        }
        if (options && typeof options === 'object' && 'httpMetadata' in options) {
            for (const [key, value] of Object.entries(options.httpMetadata)) {
                if (value) setAttribute(data.name!, `user.${Strings.kebabCase(key)}`, value as string);
            }
        }
        return new FileObject(key, data);
    }

    createMultipartUpload(_key: string, _options?: R2MultipartOptions | undefined): Promise<R2MultipartUpload> {
        throw new Error("Method not implemented.");
    }

    resumeMultipartUpload(_key: string, _uploadId: string): R2MultipartUpload {
        throw new Error("Method not implemented.");
    }

    delete(_keys: string | string[]): Promise<void> {
        throw new Error("Method not implemented.");
    }

    list(_options?: R2ListOptions | undefined): Promise<R2Objects> {
        throw new Error("Method not implemented.");
    }

}