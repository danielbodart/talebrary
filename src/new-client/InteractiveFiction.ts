import type {Dependency} from "../yadic/mod.ts";
import {CustomElementDefinition} from "../client/components/CustomElementDefinition.ts";
import {engineMapping} from "../client/types.ts";
import {get, type Http} from "../http/mod.ts";
import {MiniDialog} from "../client/MiniDialog.ts";
import {MiniGlkOte} from "../client/MiniGlkOte.ts";
import {Buffer} from "buffer/";
import type {SupportedGameType} from "../types.ts";


export interface InteractiveFictionDependencies extends
    Dependency<'HTMLElement', typeof HTMLElement>,
    Dependency<'Dialog', MiniDialog>,
    Dependency<'GlkOte', MiniGlkOte>,
    Dependency<'http', Http>
{}

export class InteractiveFiction {
    static definition({HTMLElement, http, Dialog, GlkOte}: InteractiveFictionDependencies) {
        return new CustomElementDefinition('interactive-fiction', class extends HTMLElement {
            constructor() {
                super();
                console.log('InteractiveFiction constructor');
            }

            async connectedCallback() {
                console.log('InteractiveFiction connected');
                const type = this.getAttribute('type') as SupportedGameType;
                const story = this.getAttribute('story')!;
                const prefix = this.getAttribute('prefix') || '';

                const engineName = engineMapping.get(type);
                if (!engineName) throw new Error('Unsupported engine');
                const engine = (await import(`${prefix}/emglken/src/${engineName}.js`)).default;

                const wasmResponse = await http(get(`${prefix}/emglken/build/${engineName}-core.wasm`));
                if (!wasmResponse.ok) throw new Error('Unable to fetch engine wasm');

                const storyResponse = await http(get(story));
                if (!storyResponse.ok) throw new Error('Unable to fetch story');

                const options = {
                    Dialog,
                    Glk: {},
                    GlkOte,
                    wasmBinary: Buffer.from(await wasmResponse.arrayBuffer())
                }

                const vm = await new engine();
                vm.init(Buffer.from(await storyResponse.arrayBuffer()), options);
                await vm.start();
                console.log('InteractiveFiction vm started');
            }
        });
    }
}