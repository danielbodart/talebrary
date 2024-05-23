import type {R2HTTPMetadata} from "@cloudflare/workers-types";
import {getAttribute} from "./attributes.ts";

export function getHttpMetadata(file: string): R2HTTPMetadata | undefined {
    return {
        contentType: getAttribute(file, 'user.content-type'),
        cacheControl: getAttribute(file, 'user.cache-control'),
    }
}