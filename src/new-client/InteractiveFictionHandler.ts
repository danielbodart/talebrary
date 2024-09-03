import {get, type Http, type HttpHandler} from "../http/mod.ts";
import type {SupportedGameType} from "../types.ts";
import type {MiniDialog} from "../client/MiniDialog.ts";
import {engineMapping, type SpecialResponseMessage, type UpdateMessage} from "../client/types.ts";
import {Buffer} from "buffer/";
import type {Dependency} from "../yadic/mod.ts";
import {default_metrics} from "../client/MiniGlkOte.ts";
import {cache} from "../system/cache.ts";

export interface InteractiveFictionHandlerDependencies extends 
    Dependency<'http', Http>,
    Dependency<'Dialog', MiniDialog>
{}

export class InteractiveFictionHandler implements HttpHandler {
    constructor(private deps: InteractiveFictionHandlerDependencies) {
    }

    async handle(request: Request): Promise<Response> {
        return new Promise(async (resolve, reject) => {
            const engine = await this.getEngine(request.url, request.headers.get('accept') as SupportedGameType);
            engine.resolve = (m:object) => resolve(new Response(JSON.stringify(m), {status: 200}));
            engine.reject = (m:object) => reject(new Response(JSON.stringify(m), {status: 500}));
            engine.accept(await request.json());
        });
    }

    @cache private async getEngine(src: string, type: SupportedGameType) {
        const GlkOte = new ResolveRejectGlkOte();

        const engineName = engineMapping.get(type);
        if (!engineName) throw new Error('Unsupported engine');
        const engine = (await import(`/emglken/src/${engineName}.js`)).default;

        const wasmResponse = await this.deps.http(get(`/emglken/build/${engineName}-core.wasm`));
        if (!wasmResponse.ok) throw new Error('Unable to fetch engine wasm');

        const storyResponse = await this.deps.http(get(src));
        if (!storyResponse.ok) throw new Error('Unable to fetch story');

        const options = {
            Dialog: this.deps.Dialog,
            Glk: {},
            GlkOte,
            wasmBinary: Buffer.from(await wasmResponse.arrayBuffer())
        }

        const vm = await new engine();
        vm.init(Buffer.from(await storyResponse.arrayBuffer()), options);
        await vm.start();

        return GlkOte;
    }

}

export class ResolveRejectGlkOte {
    private iface: any;
    private dialog?: MiniDialog;
    public resolve: any;
    public reject: any;

    init(iface: any) {
        console.log('ResolveRejectGlkOte.init', iface);
        this.iface = iface;
        this.dialog = iface.Dialog;
    }

    getinterface() {
        console.log('ResolveRejectGlkOte.getinterface');
        return this.iface
    }

    accept(data: any) {
        console.log('ResolveRejectGlkOte.accept', data);
        if (data.type === 'init') {
            data.metrics = Object.assign({}, default_metrics, data.metrics)
        }
        if (data.type === 'specialresponse' && typeof data.value === 'string') {
            data.value = {filename: data.value}
        }
        this.iface.accept(data)
    }

    update(data: UpdateMessage) {
        console.log('ResolveRejectGlkOte.update', data);
        if (data.specialinput && data.specialinput.type === "fileref_prompt") {
            const fileRef = this.dialog!.file_construct_ref(data.specialinput.filetype, data.specialinput.filemode, data.specialinput.gameid);
            const response: SpecialResponseMessage = {
                gen: data.gen,
                type: "specialresponse",
                response: "fileref_prompt",
                value: fileRef
            };
            this.accept(response)
        } else {
            this.resolve(data)
        }
    }

    error(msg: any) {
        console.log('ResolveRejectGlkOte.error', msg);
        this.reject(msg)
    }
}