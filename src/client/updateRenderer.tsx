import {
    type BufferContent,
    type BufferWindow,
    type GridContent,
    type GridWindow,
    type CharInput,
    type LineInput,
    isBufferContent,
    type MessageHandler,
    type UpdateMessage, isLineData, type GraphicsWindow, type GraphicsContent, isGridContent
} from "./types.ts";
import {fragment} from "../templates/Fragment.tsx";
import * as elements from "typed-html";

export class UpdateRenderer {
    constructor(private document: Document, private messageHandler: MessageHandler) {
        messageHandler.postMessage({type: "init", gen: 0, metrics: {width: 80, height: 24}});
        messageHandler.onMessage(message => {
            if (message.type !== 'update') return;
            this.handle(message as UpdateMessage);
        })
    }

    handle(update: UpdateMessage): void {
        this.render(update);
    }

    updateWindows(updates: (GridWindow | BufferWindow | GraphicsWindow)[]) {
        return updates
            .map(update => {
                const window = this.getWindow(update.id);
                if (window) return window;
                this.document.body.append(fragment(<div id={`window-${update.id}`}
                                                        class={`window ${update.type}`}>
                    { update.type === "grid" ?
                        Array(update.gridheight).fill(1).map((_, i) => <div id={`grid-line-${i}`} class="line"></div>).join('') :
                        ''
                    }
                </div>))
            });
    }

    getWindow(id: number) {
        return this.document.querySelector<HTMLDivElement>(`#window-${id}`);
    }

    private breakOn = new Set(['header', 'subheader']);

    updateContent(updates: (GridContent | BufferContent | GraphicsContent)[]) {
        return updates.map(update => {
            const window = this.getWindow(update.id);
            if (!window) throw new Error(`Could not find window ${update.id}`);

            if(isGridContent(update)){
                update.lines.forEach(line => {
                    const htmlLine = window.querySelector<HTMLDivElement>(`#grid-line-${line.line}`)!;
                    htmlLine.innerHTML = line.content.map(c => <span class={c.style}>{c.text}</span>).join('');
                })
            }

            if (isBufferContent(update)) {
                if (update.clear) window.innerHTML = '';

                const html = fragment(<div class="card">
                        {
                            update.text.flatMap(t => {
                                if (!('content' in t)) {
                                    return '';
                                } else if (t.content.length === 1) {
                                    return t.content.filter(isLineData).map(c => {
                                        return (this.breakOn.has(c.style) ? '</div><div class="card">' : '') +
                                            (c.text === '>' ? '' : <div class={c.style}>{c.text}</div>)
                                    });
                                } else {
                                    return <div class="paragraph">{t.content.filter(isLineData).map(c => <span
                                        class={c.style}>{c.text}</span>)}</div>
                                }
                            }).join('')
                        }
                    </div>
                );

                const input = window.querySelector<HTMLDivElement>('.input-control');
                if (input) {
                    window.insertBefore(html, input);
                    const htmlInputElement = input.querySelector('input')!;
                    htmlInputElement.scrollIntoView();
                } else {
                    window.append(html)
                }
            }
        })
    }

    updateInput(updates: (CharInput | LineInput)[]) {
        return updates.map(update => {
            const window = this.getWindow(update.id);
            if (!window) throw new Error(`Could not find window ${update.id}`);

            const input = window.querySelector('.input-control');
            if (!input) {
                window.append(fragment(
                    <div class="card input-control">
                        <form class="input">
                            <input type="text" maxlength={String('maxlen' in update ? update.maxlen : 0)} autofocus="autofocus"
                                   data-gen={update.gen} data-id={update.id} data-type={update.type} value={'initial' in update ? update.initial : ''}/>
                        </form>
                    </div>));
                const htmlInput = window.querySelector<HTMLInputElement>('.input-control form input')!;
                window.querySelector('.input-control form')!.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.messageHandler.postMessage({
                        type: htmlInput.dataset.type!,
                        gen: Number(htmlInput.dataset.gen),
                        window: Number(htmlInput.dataset.id),
                        value: htmlInput.value
                    });
                    htmlInput.value = ''
                });
                htmlInput.addEventListener('keydown', (e) => {
                    if (htmlInput.dataset.type !== 'char') return;
                    e.preventDefault();
                    this.messageHandler.postMessage({
                        type: htmlInput.dataset.type!,
                        gen: Number(htmlInput.dataset.gen),
                        window: Number(htmlInput.dataset.id),
                        value: e.key
                    });
                });
            } else {
                const textInput = input.querySelector('input')!;
                textInput.maxLength = 'maxlen' in update ? update.maxlen : 0;
                textInput.dataset.gen = String(update.gen);
                textInput.dataset.id = String(update.id);
                textInput.dataset.type = update.type;
            }
        })
    }

    render(update: UpdateMessage) {
        if (update.windows) this.updateWindows(update.windows);
        if (update.content) this.updateContent(update.content);
        if (update.input) this.updateInput(update.input);
    }
}