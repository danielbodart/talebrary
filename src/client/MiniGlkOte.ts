import type {Logger, MessageHandler, Metrics} from "./types.ts";

export class MiniGlkOte {
    private iface: any;

    constructor(private messageHandler: MessageHandler, private logger: Logger) {
    }

    init(iface: any) {
        this.logger.log('MiniGlkOte.init', iface);
        this.iface = iface;
        this.messageHandler.onMessage(message => {
            if (message.type === 'update') return;
            this.accept(message)
        })
    }

    getinterface() {
        this.logger.log('MiniGlkOte.getinterface');
        return this.iface
    }

    accept(data: any) {
        this.logger.log('MiniGlkOte.accept', data);
        if (data.type === 'init') {
            data.metrics = Object.assign({}, default_metrics, data.metrics)
        }
        if (data.type === 'specialresponse' && typeof data.value === 'string') {
            data.value = {filename: data.value}
        }
        this.iface.accept(data)
    }

    update(data: any) {
        this.logger.log('MiniGlkOte.update', data);
        this.messageHandler.postMessage(data)
    }

    error(msg: any) {
        this.logger.log('MiniGlkOte.error', msg);
    }
}

const default_metrics: Metrics = {
    width: 80,
    height: 25,
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
