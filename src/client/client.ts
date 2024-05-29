import type {SupportedGameType} from "../types.ts";
import {get, type HttpHandler} from "../http.ts";
import {Buffer} from "buffer/";
import {MiniDialog} from "./MiniDialog.ts";
import {engineMapping, type MessageHandler} from "./types.ts";
import {MiniGlkOte} from "./MiniGlkOte.ts";

export async function client(story: string,
                             type: SupportedGameType,
                             prefix: string = '',
                             http: HttpHandler = fetch,
                             storage: Storage = window.localStorage,
                             messageHandler: MessageHandler = window) {
    const engineName = engineMapping.get(type);
    if (!engineName) throw new Error('Unsupported engine');
    const engine = (await import(`${prefix}/emglken/src/${engineName}.js`)).default;

    const wasmResponse = await http(get(`${prefix}/emglken/build/${engineName}-core.wasm`));
    if (!wasmResponse.ok) throw new Error('Unable to fetch engine wasm');

    const storyResponse = await http(get(story));
    if (!storyResponse.ok) throw new Error('Unable to fetch story');

    const options = {
        Dialog: new MiniDialog(storage),
        Glk: {},
        GlkOte: new MiniGlkOte(messageHandler),
        wasmBinary: Buffer.from(await wasmResponse.arrayBuffer())
    }

    const vm = await new engine();
    vm.init(Buffer.from(await storyResponse.arrayBuffer()), options);
    await vm.start();
}


