import type {MessageHandler} from "./types.ts";

export class MiniGlkOte {
    private iface: any;

    constructor(private message: MessageHandler) {
    }

    init(iface: any) {
        console.log('MiniGlkOte.init', iface);
        this.iface = iface;
        this.message.addEventListener('message', message => {
            if (message.data.type === 'update') return;
            this.accept(message.data)
        })
    }

    getinterface() {
        console.log('MiniGlkOte.getinterface');
        return this.iface
    }

    accept(data: any) {
        console.log('MiniGlkOte.accept', data);
        if (data.type === 'init') {
            data.metrics = Object.assign({}, default_metrics, data.metrics)
        }
        if (data.type === 'specialresponse' && typeof data.value === 'string') {
            data.value = {filename: data.value}
        }
        this.iface.accept(data)
    }

    update(data: any) {
        console.log('MiniGlkOte.update', data);
        this.message.postMessage(data)
    }

    error(msg: any) {
        console.log('MiniGlkOte.error', msg);
    }
}

const default_metrics = {
    buffercharheight: 1,
    buffercharwidth: 1,
    buffermarginx: 0,
    buffermarginy: 0,
    graphicsmarginx: 0,
    graphicsmarginy: 0,
    gridcharheight: 1,
    gridcharwidth: 1,
    gridmarginx: 0,
    gridmarginy: 0,
    height: 25,
    inspacingx: 0,
    inspacingy: 0,
    outspacingx: 0,
    outspacingy: 0,
    width: 80,
}
