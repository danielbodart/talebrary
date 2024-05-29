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

export type MessageHandler = Pick<Window, 'postMessage' | 'addEventListener'>

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

export interface RemGLKMessage {
    "type": "update",
    "gen": number,
    "windows": (GridWindow | BufferWindow)[],
    "content": (GridContent | BufferContent)[],
    "input": InputContent[]
}