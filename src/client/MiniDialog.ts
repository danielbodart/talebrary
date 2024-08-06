import {MiniGlkOte} from "./MiniGlkOte.ts";
import type {FileRef} from "./types.ts";
import type {Dependency} from "../yadic/mod.ts";

export class MiniDialog {
    streaming = false;
    GlkOte?: MiniGlkOte

    constructor(private deps: Dependency<'storage', Storage>) {
    }

    init(iface: any) {
        console.log('MiniDialog.init', iface);
        this.GlkOte = iface.GlkOte;
    }

    inited() {
        console.log('MiniDialog.inited')
        return !!this.GlkOte;
    }

    getlibrary(val: string) {
        console.log('MiniDialog.getlibrary', val);
        return val === 'GlkOte' ? this.GlkOte : null;
    }

    open(tosave: any, usage: any, gameid: any, callback: any) {
        console.log('MiniDialog.open', tosave, usage, gameid, callback)
    }

    file_clean_fixed_name() {
        console.log('MiniDialog.file_clean_fixed_name')
    }

    file_construct_ref(filename: string = '', usage: string = '', gameid: string = ''): FileRef {
        console.log('MiniDialog.file_construct_ref', filename, usage, gameid);
        var key = `${usage}:${gameid}:${filename}`;
        return {
            dirent: 'dirent:' + key, content: 'content:' + key,
            filename: filename, usage: usage, gameid: gameid
        };
    }

    file_construct_temp_ref() {
        console.log('MiniDialog.file_construct_temp_ref')
    }

    file_ref_exists(ref: any) {
        console.log('MiniDialog.file_ref_exists', ref)
        return !!this.deps.storage.getItem(ref.dirent);
    }

    file_remove_ref() {
        console.log('MiniDialog.file_remove_ref')
    }

    file_write(dirent: FileRef, content: any): boolean {
        console.log('MiniDialog.file_write', dirent, content);
        try {
            if (dirent.content) this.deps.storage.setItem(dirent.content, this.contentToString(content))
            return true;
        } catch (e) {
            console.error('MiniDialog.file_write failed', e);
            return false;
        }
    }

    private contentToString(content: any): string {
        if (typeof content === 'string') return content;
        if (content instanceof Uint8Array) return JSON.stringify(Array.from(content as any));
        throw new Error("Unsupported content type.", content);
    }

    file_read(dirent: FileRef, raw: boolean): any {
        console.log('MiniDialog.file_read', dirent, raw);
        if (dirent.content) {
            const result = this.deps.storage.getItem(dirent.content);
            return this.stringToContent(result, raw);
        }
    }

    private stringToContent(result: string | null, raw: boolean): any {
        if (!result) return null;
        if (raw) return result;
        const data = JSON.parse(result);
        if (Array.isArray(data)) return new Uint8Array(data);
        throw new Error("Unsupported content type.", data);
    }

    file_fopen() {
        console.log('MiniDialog.file_fopen')
    }

    autosave_write(signature: string, snapshot?: object) {
        console.log('MiniDialog.autosave_write')
        const key = MiniDialog.autosaveKey(signature);
        if (!snapshot) return this.deps.storage.removeItem(key);
        this.deps.storage.setItem(key, JSON.stringify(snapshot));
    }

    static autosaveKey(signature: string) {
        return 'autosave:' + signature;
    }

    autosave_read(signature: string): object {
        console.log('MiniDialog.autosave_read')
        const key = MiniDialog.autosaveKey(signature);
        const result = this.deps.storage.getItem(key);
        return result ? JSON.parse(result) : null;
    }


}