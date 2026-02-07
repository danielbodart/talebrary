import type {WasiGlkClient, ClientUpdate, WindowUpdate, InputRequestClientUpdate, ProcessedContentSpan} from "@bodar/wasiglk";
import type {BufferWindow} from "./BufferWindow.ts";
import type {GridWindow} from "./GridWindow.ts";
import type {UserInput} from "./UserInput.ts";

export class InteractiveFiction extends HTMLElement {
    private client: WasiGlkClient | null = null;
    private windows = new Map<number, BufferWindow | GridWindow>();

    async run(client: WasiGlkClient) {
        this.client = client;

        for await (const update of client.updates({width: 80, height: 24})) {
            this.handle(update);
        }
    }

    private handle(update: ClientUpdate) {
        switch (update.type) {
            case 'window':
                this.updateWindows(update.windows);
                break;
            case 'content':
                this.updateContent(update.windowId, update.clear, update.content);
                break;
            case 'input-request':
                this.updateInput(update);
                break;
            case 'error':
                console.error('[IF] Error:', update.message);
                break;
        }
    }

    private updateWindows(windows: WindowUpdate[]) {
        if (windows.length === 0) {
            this.windows.forEach(w => w.remove());
            this.windows.clear();
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

    private updateContent(windowId: number, clear: boolean, content: ProcessedContentSpan[]) {
        const el = this.windows.get(windowId);
        if (!el) return;

        if ('updateContent' in el) {
            (el as BufferWindow).updateContent(content, clear);
        } else if ('updateGridContent' in el) {
            (el as GridWindow).updateGridContent(content);
        }
    }

    private getGridRoomTitle(): string | undefined {
        for (const win of this.windows.values()) {
            if ('roomTitle' in win) return (win as GridWindow).roomTitle || undefined;
        }
    }

    private updateInput(update: InputRequestClientUpdate) {
        // Remove any existing input
        this.querySelectorAll('user-input').forEach(el => el.remove());

        const el = this.windows.get(update.windowId);
        if (!el) return;

        const input = document.createElement('user-input') as UserInput;
        input.configure(update, (value: string) => {
            this.client?.sendInput(value);
        });
        if ('detectScene' in el) {
            const gridTitle = this.getGridRoomTitle();
            (el as BufferWindow).detectScene(gridTitle);
        }

        el.appendChild(input);

        input.focus();
    }
}
