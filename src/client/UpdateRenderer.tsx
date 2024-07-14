import {
    type BufferContent,
    type BufferImage,
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
    isUpdateMessage,
    type LineData,
    type LineInput,
    type MessageHandler,
    type Metrics,
    type UpdateMessage
} from "./types.ts";
import {fragment} from "../templates/Fragment.tsx";
import * as elements from "typed-html";
import {commands, type Describable, type SceneContext, type Suggestions} from "../types.ts";
import {type InstructionEvent, InstructionEventName} from "./components/InstructionEvent.tsx";
import {EventBuilder} from "./EventBuilder.ts";
import {type Clock, SystemClock} from "../system/clock.ts";
import {type Dependency} from "../yadic/mod.ts";
import {capitalWords, wordCount} from "../system/Strings.ts";
import {Arrays} from "../system/Arrays.ts";
import {binPack} from "./BinPack.ts";
import type {Timers} from "../system/timers.ts";

function cleanLineData(content: (LineData | BufferImage)[]): LineData[] {
    return content.filter<LineData>(isLineData).map(line => {
        return {
            ...line,
            text: line.text.trim()
        }
    }).filter(line => {
        return line.text !== '' && line.text !== '>';
    });
}


function instructions(line: LineData, maxLength: number = 4): string {
    if (line.style === 'normal') {
        return line.text.replace(capitalWords, match => match.length >= 3 && wordCount(match) <= maxLength ?
            <x-instruction>{match}</x-instruction> : match);
    }
    if (line.style === "header" || line.style === 'subheader' || line.style === 'emphasized') {
        if (wordCount(line.text) <= maxLength) {
            return <x-instruction>{line.text}</x-instruction>
        }
    }
    return line.text;
}

function group(html: DocumentFragment, classes: string[]): DocumentFragment {
    const chunks = splitWhen(Array.from(html.children), (e: Element) => {
        return e.previousElementSibling instanceof HTMLElement && (e.previousElementSibling.classList.contains('normal') || e.previousElementSibling.classList.contains('input')) &&
            e instanceof HTMLElement && (e.classList.contains('header') || e.classList.contains('subheader')) &&
            e.nextElementSibling instanceof HTMLElement && e.nextElementSibling.classList.contains('normal');
    });
    return chunks.reduce((a, elements) => {
        const card = document.createElement('div');
        card.classList.add(...classes);
        card.append(...elements);
        a.appendChild(card);
        return a;
    }, fragment(''));
}

function splitWhen<T>(values: T[], predicate: (t: T) => boolean): T[][] {
    const result: T[][] = [];
    let current: T[] = [];
    for (const value of values) {
        if (predicate(value)) {
            result.push(current);
            current = [];
        }
        current.push(value);
    }
    result.push(current);
    return result;
}

export interface UpdateRendererDependencies extends Dependency<'window', Window>,
    Dependency<'document', Document>,
    Dependency<'messageHandler', MessageHandler>,
    Dependency<'clock', Clock>,
    Dependency<'timers', Timers>,
    Dependency<'metrics', Partial<Metrics>> {
}

export class UpdateRenderer {
    constructor(private deps: UpdateRendererDependencies,
                private document: Document = deps.document,
                private messageHandler: MessageHandler = deps.messageHandler,
                metrics: Partial<Metrics> = deps.metrics) {
        messageHandler.postMessage({
            type: "init",
            gen: 0,
            metrics,
            supports: ["garglktext", "graphics", "graphicswin", "hyperlinks", "timer"]
        } as InitMessage);
        messageHandler.onMessage(message => {
            if (!isUpdateMessage(message)) return;
            this.handle(message as UpdateMessage);
        })
        document.addEventListener(InstructionEventName, (ev: CustomEvent<InstructionEvent>) => {
            const htmlInput = document.querySelector<HTMLInputElement>('.window.buffer .input-control form input')!;
            htmlInput.value = `${htmlInput.value} ${ev.detail.text}`.trim();
            htmlInput.form?.dispatchEvent(new SubmitEvent('submit'))
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
                        const card = window.querySelector<HTMLElement>('.card')!;
                        card.innerHTML = this.createLines(update.gridheight);
                    }
                    return window;
                } else {
                    const main = this.document.querySelector('main') || this.document.body;
                    main.append(fragment(<div id={`window-${update.id}`}
                                              class={`window ${update.type}`}>
                        {update.type === "grid" ?
                            <div class="card">{this.createLines(update.gridheight)}</div> :
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

    updateContent(updates: (GridContent | BufferContent | GraphicsContent)[], gen: number) {
        return updates.map((update) => {
            const window = this.getWindow(update.id);
            if (!window) throw new Error(`Could not find window ${update.id}`);

            if (isGridContent(update)) {
                update.lines.forEach(line => {
                    const htmlLine = window.querySelector<HTMLDivElement>(`#grid-line-${line.line}`)!;
                    htmlLine.innerHTML = line.content.map(c => <span class={c.style}>{c.text}</span>).join('');
                })
            }

            if (isBufferContent(update)) {
                if (update.clear) {
                    const introCard = this.document.querySelector('main > .card');
                    if (introCard) introCard.parentElement!.removeChild(introCard);
                    window.innerHTML = '';
                }

                const html = fragment(update.text
                    .flatMap(t => {
                        if (!('content' in t)) return [];
                        const lineData = cleanLineData(t.content);
                        if (lineData.length === 0) return [];
                        if (lineData.length === 1) {
                            return lineData.map(c =>
                                <div class={c.style}>{c.style === 'normal' ? instructions(c) : c.text}</div>);
                        }
                        return [<div class="normal">{lineData.map(c => <span
                            class={c.style}>{instructions(c)}</span>)}</div>]
                    }).join('')
                );

                window.appendChild(group(html, ['card', 'scroll']));

                const scrollElements = Array.from(window.querySelectorAll<HTMLElement>('.card.scroll:not(:has(.input:only-child))'));
                const scroll = scrollElements[0];
                if (scroll) {
                    this.document.defaultView!.setTimeout(() => {
                        scroll.scrollIntoView({
                            block: 'start',
                            behavior: 'smooth'
                        })
                        scrollElements.forEach(e => e.classList.remove('scroll'));
                    }, 100);
                }

                // Add image
                let lastCard = window.querySelector<HTMLElement>(".card:last-child")!;
                if (lastCard) {
                    if (lastCard.classList.contains('input-control')) lastCard = lastCard.previousElementSibling as HTMLElement;

                    if (!lastCard.matches(':has(.header):has(.normal):not(:has(.image)):not(:has(.input)), :has(.subheader):has(.normal):not(:has(.image)):not(:has(.input))')) return;

                    const path = this.document.defaultView!.location.pathname;
                    const [, , id] = path.split('/');

                    const title = this.document.title;
                    const description = this.document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
                    const current = scene(lastCard);
                    const data: SceneContext = {
                        story: {
                            title,
                            description
                        },
                        scene: current,
                    };

                    for (const model of this.models) {
                        const image = `/content/${id}/art?prompt=${encodeURIComponent(JSON.stringify(data))}&model=${model}`;
                        lastCard.insertBefore(
                            fragment(<img is="x-image" reloadable class="image" loading="lazy" src={image} alt=""
                                          aria-hidden="true"
                                          data-gen={gen}/>),
                            lastCard.firstChild);
                    }

                    lastCard.classList.add('scene');

                    fetch(`/content/${id}/suggestions?prompt=${encodeURIComponent(JSON.stringify(current))}`).then(response => {
                        if (response.ok) response.json().then((json: Suggestions) => {
                            const result = Arrays.unique([...json.commands, ...json.nouns, ...json.actions])

                            lastCard.append(fragment(<div class="suggestions">{result.map(action =>
                                <x-instruction>{action}</x-instruction>)}</div>))

                            const element = lastCard.querySelector<HTMLElement>('.suggestions')!;

                            const intersect = new IntersectionObserver((entries) => entries.forEach(entry => {
                                const target = entry.target as HTMLElement;
                                return target.classList.toggle('hidden', entry.intersectionRatio < 1);
                            }), {root: element});

                            Array.from(element.children).forEach(child => intersect.observe(child));

                            new ResizeObserver(this.deps.timers.debounce(100, () => requestAnimationFrame(() => binPack(element)))).observe(element);
                        });
                    });

                    const event = new EventBuilder(this.document.defaultView!, new SystemClock()).build(current);
                    this.document.defaultView?.navigator.sendBeacon(`/events`, JSON.stringify(event));
                }
            }
        })
    }

    models = [
        '@cf/bytedance/stable-diffusion-xl-lightning',
    ];


    updateInput(updates: (CharInput | LineInput)[]) {
        const inputs = Array.from(this.document.querySelectorAll('.input-control'));
        inputs.map(i => i.parentElement!.removeChild(i));

        return updates.map(update => {
            const window = this.getWindow(update.id);
            if (!window) throw new Error(`Could not find window ${update.id}`);

            const history = Array.from(window.querySelectorAll<HTMLElement>('div.input')).flatMap(e => e.innerText.split(/\s+/));
            const auto = Array.from(new Set([...commands, ...history])).sort();

            window.append(fragment(
                <div class="card input-control">
                    <form class="input">
                        <input type="text" maxlength={String('maxlen' in update ? update.maxlen : 1)}
                               data-gen={update.gen} data-id={update.id} data-type={update.type}
                               value={'initial' in update ? update.initial : ''}
                               placeholder={update.type === "char" ? 'press key' : ''}
                               list="input-history"
                        />
                        <datalist id="input-history">
                            {auto.map(item => <option value={item}></option>)}
                        </datalist>
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

            htmlInput.focus({preventScroll: true});
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

export function scene(card: HTMLElement): Describable {
    return {
        title: card.querySelector<HTMLElement>('.header, .subheader')!.innerText,
        description: Array.from(card.querySelectorAll<HTMLElement>(':scope > .normal')).map(e => e.innerText).join(' ')
    };
}



