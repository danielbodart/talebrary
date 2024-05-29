import {MiniGlkOte} from "./MiniGlkOte.ts";

export class MiniDialog {
    streaming = false;
    GlkOte?: MiniGlkOte

    constructor(private storage: Storage) {
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

    file_construct_ref(filename: any = '', usage: any = '', gameid: any = '') {
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
        return !!this.storage.getItem(ref.dirent);
    }

    file_remove_ref() {
        console.log('MiniDialog.file_remove_ref')
    }

    file_write() {
        console.log('MiniDialog.file_write')
    }

    file_read() {
        console.log('MiniDialog.file_read')
    }

    file_fopen() {
        console.log('MiniDialog.file_fopen')
    }

    autosave_write() {
        console.log('MiniDialog.autosave_write')
    }

    autosave_read() {
        console.log('MiniDialog.autosave_read')
    }
}