import type {Logger, MessageHandler, Metrics, SpecialResponseMessage, UpdateMessage} from "./types.ts";
import type {MiniDialog} from "./MiniDialog.ts";
import type {Dependency} from "../yadic/mod.ts";

export interface MiniGlkOteDependencies extends
    Dependency<'messageHandler', MessageHandler>, Dependency<'logger', Logger>
{}

export class MiniGlkOte {
    private iface: any;
    private dialog?: MiniDialog;

    constructor(private deps: MiniGlkOteDependencies) {
    }

    init(iface: any) {
        this.deps.logger.log('MiniGlkOte.init', iface);
        this.iface = iface;
        this.dialog = iface.Dialog;
        this.deps.messageHandler.onMessage(message => {
            if (message.type === 'update') return;
            this.accept(message)
        })
    }

    getinterface() {
        this.deps.logger.log('MiniGlkOte.getinterface');
        return this.iface
    }

    accept(data: any) {
        this.deps.logger.log('MiniGlkOte.accept', data);
        if (data.type === 'init') {
            data.metrics = Object.assign({}, default_metrics, data.metrics)
        }
        if (data.type === 'specialresponse' && typeof data.value === 'string') {
            data.value = {filename: data.value}
        }
        this.iface.accept(data)
    }

    update(data: UpdateMessage) {
        this.deps.logger.log('MiniGlkOte.update', data);
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
            this.deps.messageHandler.postMessage(data)
        }
    }

    error(msg: any) {
        this.deps.logger.log('MiniGlkOte.error', msg);
    }
}

export const default_metrics: Metrics = {
    width: 80,
    height: 50,
    buffercharheight: 1,
    buffercharwidth: 1,
    gridcharheight: 1,
    gridcharwidth: 1,
    buffermarginx: 0,
    buffermarginy: 0,
    graphicsmarginx: 0,
    graphicsmarginy: 0,
    gridmarginx: 0,
    gridmarginy: 0,
    inspacingx: 0,
    inspacingy: 0,
    outspacingx: 0,
    outspacingy: 0,
}
