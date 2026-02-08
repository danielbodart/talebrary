export interface ConditionalGet {
    etagDoesNotMatch?: string;
}

export interface PutOptions {
    contentType?: string;
    cacheControl?: string;
    customMetadata?: Record<string, string>;
}

export interface TalebraryBucket {
    get(key: string, options?: { onlyIf?: ConditionalGet }): Promise<Response>;
    put(key: string, value: ArrayBuffer | Uint8Array | string, options?: PutOptions): Promise<void>;
}
