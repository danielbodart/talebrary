import {fileTypeFromBuffer} from "file-type";

export async function detectMimeType(data: Uint8Array, defaultMimeType = 'application/octet-stream'): Promise<string> {
    try {
        return (await fileTypeFromBuffer(data))!.mime;
    } catch (e) {
        return defaultMimeType;
    }
}