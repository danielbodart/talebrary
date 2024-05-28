import type {SupportedGameType} from "./types.ts";
import {get, type HttpHandler} from "./http.ts";

export type SupportedEngines = 'bocfel' | 'glulxe' | 'git' | 'hugo' | 'scare' | 'tads';

const engineMapping = new Map<SupportedGameType, SupportedEngines>([
    ['zcode', 'bocfel'],
    ['blorb/zcode', 'bocfel'],
    ['glulx', 'glulxe'],
    ['blorb/glulx', 'glulxe'],
    ['hugo', 'hugo'],
    ['adrift', 'scare'],
    ['tads2', 'tads'],
    ['tads3', 'tads']
])

export async function client(story: string, type: SupportedGameType, prefix:string = '', http: HttpHandler = fetch) {
    const engineName = engineMapping.get(type);
    if (!engineName) throw new Error('Unsupported engine');
    const engine = (await import(`${prefix}/engines/${engineName}-core.js`)).default;

    const wasmResponse = await http(get(`${prefix}/engines/${engineName}-core.wasm`));
    if (!wasmResponse.ok) throw new Error('Unable to fetch engine wasm');

    const storyResponse = await http(get(story));
    if (!storyResponse.ok) throw new Error('Unable to fetch story');

    const options = {
        Dialog: debugProxy('Dialog'),
        Glk: {},
        GlkOte: debugProxy('GlkOte'),
        wasmBinary: wasmResponse.arrayBuffer()
    }

    const vm = await new engine();
    console.log('vm', vm)
    vm.init(storyResponse.arrayBuffer(), options);
    vm.start();
}

function debugProxy(name: string, target = {} as any): any {
    return new Proxy(target, {
        get(_target: any, property: string | symbol, _receiver: any): any {
            const child = `${name}.${String(property)}`;
            console.log('get', child);
            return debugProxy(child);
        },

        set(_target: any, property: string | symbol, newValue: any, _receiver: any): boolean {
            const child = `${name}.${String(property)}`;
            console.log('set', child, newValue);
            return debugProxy(child);
        },

        apply(_target: any, _this: any, args: any[]): any {
            const child = `${name}(` + args.join(', ') + ')';
            console.log('apply', child);
            return debugProxy(child);
        }
    });
}