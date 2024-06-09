import {
    type BufferContent,
    type BufferWindow,
    type CharInput,
    type GraphicsContent,
    type GraphicsWindow,
    type GridContent,
    type GridWindow,
    type InitMessage,
    isBufferContent,
    isGridContent,
    isLineData,
    type LineInput,
    type MessageHandler,
    type Metrics,
    type UpdateMessage
} from "./types.ts";
import {fragment} from "../templates/Fragment.tsx";
import * as elements from "typed-html";

export class UpdateRenderer {
    constructor(private document: Document, private messageHandler: MessageHandler, metrics: Partial<Metrics> = {}) {
        messageHandler.postMessage({type: "init", gen: 0, metrics} as InitMessage);
        messageHandler.onMessage(message => {
            if (message.type !== 'update') return;
            this.handle(message as UpdateMessage);
        })
    }

    handle(update: UpdateMessage): void {
        if (update.windows) this.updateWindows(update.windows);
        if (update.content) this.updateContent(update.content, update.gen);
        if (update.input) this.updateInput(update.input);
    }

    updateWindows(updates: (GridWindow | BufferWindow | GraphicsWindow)[]) {
        if (updates.length === 0) {
            const inputs = Array.from(this.document.querySelectorAll('.window'));
            inputs.map(i => i.parentElement!.removeChild(i));
            return
        }

        return updates
            .map(update => {
                const window = this.getWindow(update.id);
                if (window) {
                    if (update.type === "grid") {
                        window.innerHTML = this.createLines(update.gridheight);
                    }
                    return window;
                } else {
                    this.document.body.append(fragment(<div id={`window-${update.id}`}
                                                            class={`window ${update.type}`}>
                        {update.type === "grid" ?
                            this.createLines(update.gridheight) :
                            ''
                        }
                    </div>))
                }
            });
    }

    private createLines(count: number) {
        return Array(count).fill(1).map((_, i) => <div id={`grid-line-${i}`} class="line"></div>).join('');
    }

    getWindow(id: number) {
        return this.document.querySelector<HTMLDivElement>(`#window-${id}`);
    }

    private breakOn = new Set(['header', 'subheader']);

    updateContent(updates: (GridContent | BufferContent | GraphicsContent)[], gen: number) {
        return updates.map(update => {
            const window = this.getWindow(update.id);
            if (!window) throw new Error(`Could not find window ${update.id}`);

            if (isGridContent(update)) {
                update.lines.forEach(line => {
                    const htmlLine = window.querySelector<HTMLDivElement>(`#grid-line-${line.line}`)!;
                    htmlLine.innerHTML = line.content.map(c => <span class={c.style}>{c.text}</span>).join('');
                })
            }

            if (isBufferContent(update)) {
                if (update.clear && gen > 1) {
                    const introCard = this.document.querySelector('body > .card');
                    if (introCard) introCard.parentElement!.removeChild(introCard);
                    window.innerHTML = '';
                }

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
                                    return <div class="normal">{t.content.filter(isLineData).map(c => <span
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
                    htmlInputElement.focus();
                } else {
                    window.append(html)
                }

                // Add image
                let lastCard = window.querySelector(".card:last-child");
                if (lastCard) {
                    if (lastCard.classList.contains('input-control')) lastCard = lastCard.previousElementSibling!;

                    if (!lastCard.matches(':has(.header):has(.normal):not(:has(.image)):not(:has(.input)), :has(.subheader):has(.normal):not(:has(.image)):not(:has(.input))')) return;

                    const path = this.document.defaultView!.location.pathname;
                    const [, , id] = path.split('/');

                    const title = document.title;
                    const author = document.querySelector<HTMLElement>('.author')!.innerText;
                    const description = document.querySelector('meta[name="description"]')!.getAttribute('content');
                    // @ts-ignore
                    const scenenTitle = lastCard.querySelector('.header, .subheader').innerText;
                    const sceneDescription = Array.from(lastCard.querySelectorAll<HTMLElement>(':scope > .normal')).map(e => e.innerText).join(' ');
                        const json = JSON.stringify({
                        story: {
                            title,
                            author,
                            description,
                        },
                        scene: {
                            title: scenenTitle,
                            description: sceneDescription
                        }
                    });

                    const image = `/content/${id}/art?prompt=${encodeURIComponent(json)}`;
                    lastCard.insertBefore(fragment(<img class="image" loading="lazy" src={image}/>), lastCard.firstChild);
                }
            }
        })
    }

    updateInput(updates: (CharInput | LineInput)[]) {
        if (updates.length === 0) {
            const inputs = Array.from(this.document.querySelectorAll('.input-control'));
            inputs.map(i => i.parentElement!.removeChild(i));
            return
        }

        return updates.map(update => {
            const window = this.getWindow(update.id);
            if (!window) throw new Error(`Could not find window ${update.id}`);

            const input = window.querySelector('.input-control');
            if (!input) {
                window.append(fragment(
                    <div class="card input-control">
                        <form class="input">
                            <input type="text" maxlength={String('maxlen' in update ? update.maxlen : 1)}
                                   autofocus="autofocus"
                                   data-gen={update.gen} data-id={update.id} data-type={update.type}
                                   value={'initial' in update ? update.initial : ''}
                            />
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
                // This event is only used on android where keydown e.key returns 'Unidentified' (except for the enter key)
                htmlInput.addEventListener('input', (e) => {
                    if (htmlInput.dataset.type !== 'char') return;
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
                    if (htmlInput.dataset.type !== 'char' || e.key === 'Unidentified') return;
                    e.preventDefault();
                    this.messageHandler.postMessage({
                        type: htmlInput.dataset.type!,
                        gen: Number(htmlInput.dataset.gen),
                        window: Number(htmlInput.dataset.id),
                        value: AdjustKeys[e.key] ?? e.key
                    });
                });
                htmlInput.scrollIntoView();
                htmlInput.focus();
            } else {
                const textInput = input.querySelector('input')!;
                textInput.maxLength = 'maxlen' in update ? update.maxlen : 1;
                textInput.dataset.gen = String(update.gen);
                textInput.dataset.id = String(update.id);
                textInput.dataset.type = update.type;
                textInput.scrollIntoView();
                textInput.focus();
            }
        })
    }
}

// @ts-ignore
const AdjustKeys: { [key: string]: string } = {
    'ArrowLeft': 'left',
    'ArrowRight': 'right',
    'ArrowUp': 'up',
    'ArrowDown': 'down',
    'Enter': 'return',
    'F1': 'func1',
    'F2': 'func2',
    'F3': 'func3',
    'F4': 'func4',
    'F5': 'func5',
    'F6': 'func6',
    'F7': 'func7',
    'F8': 'func8',
    'F9': 'func9',
    'F10': 'func10',
    'F11': 'func11',
    'F12': 'func12',
}