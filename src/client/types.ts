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

    onMessage<T extends BaseMessage>(fun: (message: T) => void): void
}

export interface Logger {
    log(message?: any, ...optionalParams: any[]): void;
}

export class NoLogger implements Logger {
    log(_message?: any, ..._optionalParams: any[]): void {
    }
}

export interface BaseWindow {
    id: number,
    type: string,
    rock: number,
    styles: {},
    left: number,
    top: number,
    width: number,
    height: number
}

export interface GridWindow extends BaseWindow {
    type: 'grid'
    gridwidth: number,
    gridheight: number,
}

export interface BufferWindow extends BaseWindow {
    type: "buffer",
}

export interface GraphicsWindow extends BaseWindow {
    type: "graphics",
    graphwidth: number,
    graphheight: number,
}

export interface LineData {
    style: 'normal' | 'header' | "subheader" | "alert"
    text: string,
    hyperlink?: string,
}

export function isLineData(value: any): value is LineData {
    return value
        && 'style' in value && typeof value.style === 'string'
        && 'text' in value && typeof value.text === 'string';
}

export interface BufferImage {
    special: 'image',
    width: number,
    height: number,
    image?: number,
    url?: string,
    hyperlink?: string,
    alignment?:  "inlineup" | "inlinedown" | "inlinecenter" | "marginleft" | "marginright",
    alttext?: string
}

export interface GridLine {
    line: number,
    content: LineData[]
}

export interface GridContent {
    id: number,
    lines: GridLine[]
}

export function isGridContent(value: any): value is GridContent {
    return value && typeof value === "object"
        && 'id' in value && typeof value.id === 'number'
        && 'lines' in value && Array.isArray(value.lines);
}

export interface EmptyText {
}

export interface BufferText {
    append?: boolean,
    flowbreak?: boolean,
    content: (LineData| BufferImage)[]
}

export interface BufferContent {
    id: number,
    clear?: boolean,
    text: (EmptyText| BufferText)[]
}

export function isBufferContent(value: any): value is BufferContent {
    return value && typeof value === "object"
        && 'id' in value && typeof value.id === 'number'
        && 'text' in value && Array.isArray(value.text);
}

export interface GraphicImage {
    special: 'image',
    image: number,
    url: string
    x: number,
    y: number,
    width: number,
    height: number,
}

export interface GraphicsContent {
    id: number,
    draw: (
        { special: 'setcolor', color: string } |
        { special: 'fill' } |
        { special: 'fill', color: string,
            x: number, y: number, width: number, height: number } |
        GraphicImage
       )[]
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

export interface InputMessage extends BaseMessage {
    id: number,
    hyperlink?: boolean,
    mouse?: boolean,
    xpos?: number,
    ypos?: number,
}

export interface CharInput extends InputMessage {
    type: 'char'
}

export interface LineInput extends InputMessage {
    type: 'line',
    maxlen: number,
    initial?: string,
    terminators?: string[],
}

export interface UpdateMessage extends BaseMessage {
    type: "update",
    windows?: (GridWindow | BufferWindow | GraphicsWindow)[],
    content?: (GridContent | BufferContent | GraphicsContent)[],
    input?: (CharInput | LineInput)[],
    timer?: number,
    disable?: boolean,
    specialinput?: FilePromptMessage
}

export interface FilePromptMessage extends BaseMessage {
    type: 'fileref_prompt',
    filemode: 'read' | 'write' | 'readwrite' | 'writeappend',
    filetype: 'data' | 'save' | 'transcript' | 'command',
    gameid: string
}

export interface FilePromptResponse extends BaseWindow {
    type: 'specialresponse',
    response: 'fileref_prompt',
    value: any
}