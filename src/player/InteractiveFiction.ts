import type {WasiGlkClient, RemGlkUpdate, WindowUpdate, ContentUpdate, InputRequest, ContentSpan, TextSpan, TextParagraph, GridLine} from "@bodar/wasiglk";
import type {BufferWindow} from "./BufferWindow.ts";
import type {GridWindow} from "./GridWindow.ts";
import type {UserInput} from "./UserInput.ts";

export class InteractiveFiction extends HTMLElement {
    private client: WasiGlkClient | null = null;
    private windows = new Map<number, BufferWindow | GridWindow>();
    private windowTypes = new Map<number, 'buffer' | 'grid'>();

    async run(client: WasiGlkClient) {
        this.client = client;

        for await (const update of client.updates()) {
            this.handle(update);
        }
    }

    private handle(update: RemGlkUpdate) {
        if (update.type === 'error') {
            console.error('[IF] Error:', update.message);
            return;
        }

        if (update.windows) this.updateWindows(update.windows);

        if (update.content) {
            // Process grid windows first so gridTitle is set before buffer content renders
            const grid = update.content.filter(c => this.windowTypes.get(c.id) === 'grid');
            const buffer = update.content.filter(c => this.windowTypes.get(c.id) !== 'grid');
            for (const c of grid) this.updateContent(c);
            for (const c of buffer) this.updateContent(c);
        }

        if (update.input) {
            for (const input of update.input) {
                this.updateInput(input);
            }
        }
    }

    private updateWindows(windows: WindowUpdate[]) {
        if (windows.length === 0) {
            this.windows.forEach(w => w.remove());
            this.windows.clear();
            this.windowTypes.clear();
            return;
        }

        for (const win of windows) {
            let el = this.windows.get(win.id);
            if (!el) {
                if (win.type === 'grid') {
                    el = document.createElement('grid-window') as GridWindow;
                } else {
                    el = document.createElement('buffer-window') as BufferWindow;
                }
                el.id = `window-${win.id}`;
                el.dataset.windowId = String(win.id);
                this.windows.set(win.id, el);
                this.windowTypes.set(win.id, win.type === 'grid' ? 'grid' : 'buffer');
                if (win.type === 'grid') {
                    const firstBuffer = this.querySelector('buffer-window');
                    if (firstBuffer) {
                        this.insertBefore(el, firstBuffer);
                    } else {
                        this.appendChild(el);
                    }
                } else {
                    this.appendChild(el);
                }
            }
            if (win.type === 'grid' && 'setGridSize' in el) {
                (el as GridWindow).setGridSize(win.gridheight ?? 0);
            }
        }
    }

    private updateContent(content: ContentUpdate) {
        const el = this.windows.get(content.id);
        if (!el) return;

        if ('updateContent' in el) {
            const spans = extractBufferSpans(content.text ?? []);
            (el as BufferWindow).updateContent(spans, content.clear ?? false);
        } else if ('updateGridContent' in el) {
            const spans = extractGridSpans(content.lines ?? []);
            (el as GridWindow).updateGridContent(spans);
            const title = (el as GridWindow).roomTitle;
            if (title) {
                for (const win of this.windows.values()) {
                    if ('gridTitle' in win) (win as BufferWindow).gridTitle = title;
                }
            }
        }
    }

    private updateInput(input: InputRequest) {
        // Remove any existing input
        this.querySelectorAll('user-input').forEach(el => el.remove());

        const el = this.windows.get(input.id);
        if (!el) return;

        const userInput = document.createElement('user-input') as UserInput;
        userInput.configure(input, (value: string) => {
            if ('echoInput' in el) (el as BufferWindow).echoInput(value);
            this.client?.sendInput(value);
        });
        if ('detectScene' in el) {
            (el as BufferWindow).detectScene();
        }

        el.appendChild(userInput);

        userInput.focus();
    }
}

function normalizeSpan(span: ContentSpan): TextSpan {
    if (typeof span === 'string') return {text: span};
    if ('text' in span) return span;
    return {text: ''};
}

function extractBufferSpans(paragraphs: TextParagraph[]): TextSpan[] {
    return paragraphs.flatMap(para =>
        (para.content ?? []).map(normalizeSpan)
    );
}

function extractGridSpans(lines: GridLine[]): TextSpan[] {
    return lines.flatMap(line =>
        (line.content ?? []).map(normalizeSpan)
    );
}
