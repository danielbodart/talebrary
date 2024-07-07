import type {SupportedGameType} from "../types.ts";
import {get, type Http} from "../http/mod.ts";
import {Buffer} from "buffer/";
import {MiniDialog} from "./MiniDialog.ts";
import {type BaseMessage, engineMapping, isBaseMessage, type Logger, type MessageHandler} from "./types.ts";
import {MiniGlkOte} from "./MiniGlkOte.ts";
import type {Dependency} from "../yadic/mod.ts";

export class WindowMessageHandler implements MessageHandler {
    constructor(deps: Dependency<'window', Window>, private window: Window = deps.window) {
    }

    postMessage<T extends BaseMessage>(message: T): void {
        this.window.postMessage(message);
    }

    onMessage<T extends BaseMessage>(fun: (message: T) => void): void {
        this.window.addEventListener('message', e => isBaseMessage(e.data) ? fun(e.data as T) : undefined);
    }
}

export interface ClientDependencies extends
    Dependency<'story', string>,
    Dependency<'type', SupportedGameType>,
    Dependency<'storage', Storage>,
    Dependency<'messageHandler', MessageHandler>,
    Dependency<'http', Http>,
    Dependency<'logger', Logger>
{}

export async function client({story, type, storage, messageHandler, http, logger}: ClientDependencies,
                             prefix: string = '') {
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
        GlkOte: new MiniGlkOte(messageHandler, logger),
        wasmBinary: Buffer.from(await wasmResponse.arrayBuffer())
    }

    const vm = await new engine();
    vm.init(Buffer.from(await storyResponse.arrayBuffer()), options);
    await vm.start();
    return 'Created VM';
}


