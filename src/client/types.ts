import type {SupportedGameType} from "../types.ts";

export type SupportedEngines = 'bocfel' | 'glulxe' | 'git' | 'hugo' | 'scare' | 'tads';

export const engineMapping = new Map<SupportedGameType, SupportedEngines>([
    ['zcode', 'bocfel'],
    ['blorb/zcode', 'bocfel'],
    ['glulx', 'glulxe'],
    ['blorb/glulx', 'glulxe'],
    ['hugo', 'hugo'],
    ['adrift', 'scare'],
    ['tads2', 'tads'],
    ['tads3', 'tads']
])

export interface MessageHandler {
    postMessage<T extends BaseMessage>(message: T): void;
    onMessage<T extends BaseMessage>(fun:(message: T) => void): void
}

export interface Logger {
    log(message?: any, ...optionalParams: any[]): void;
}

export class NoLogger implements Logger {
    log(_message?: any, ..._optionalParams: any[]): void {
    }
}

export interface GridWindow {
    "id": number,
    "type": "grid",
    "rock": number,
    "gridwidth": number,
    "gridheight": number,
    "styles": {},
    "left": number,
    "top": number,
    "width": number,
    "height": number
}

export interface BufferWindow {
    "id": number,
    "type": "buffer",
    "rock": number,
    "styles": {},
    "left": number,
    "top": number,
    "width": number,
    "height": number
}

export interface GridContent {
    "id": number,
    "lines": {
        "line": number,
        "content": {
            "style": "alert",
            "text": string
        }[]
    }[]
}

export interface BufferContent {
    "id": number,
    "clear": boolean,
    "text": Partial<{
        "append": boolean
        "content": {
            "style": "normal" | "subheader"
            "text": string
        }[]
    }>[]
}

export interface InputContent {
    "id": number,
    "gen": number,
    "type": "line",
    "maxlen": number
}

export interface Metrics {
    width: number,
    height: number,
    buffercharheight: number
    buffercharwidth: number,
    gridcharheight: number,
    gridcharwidth: number,
    buffermarginx: number,
    buffermarginy: number,
    graphicsmarginx: number,
    graphicsmarginy: number,
    gridmarginx: number,
    gridmarginy: number,
    inspacingx: number,
    inspacingy: number,
    outspacingx: number,
    outspacingy: number,
}

export interface BaseMessage {
    "type": string,
    "gen": number,
}

export interface InitMessage extends BaseMessage {
    "type": "init",
    "metrics": Partial<Metrics>
}

export interface UpdateMessage extends BaseMessage {
    "type": "update",
    "windows": (GridWindow | BufferWindow)[],
    "content": (GridContent | BufferContent)[],
    "input": InputContent[]
}