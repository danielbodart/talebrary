import {createClient, detectFormat} from "@bodar/wasiglk";
import {constructor, instance, LazyMap} from "@bodar/yadic/LazyMap.ts";
import {SystemClock} from "../system/clock.ts";
import {ImageElement} from "../components/ImageElement.ts";
import {customElement, realise} from "../components/misc.ts";
import {controlKeys} from "./controlKeys.ts";
import {InteractiveFiction} from "./InteractiveFiction.ts";
import {BufferWindow} from "./BufferWindow.ts";
import {GridWindow} from "./GridWindow.ts";
import {UserInput} from "./UserInput.ts";
import {type InstructionDetail, Instruction, InstructionEventName} from "./Instruction.ts";
import {observeCarousels} from "./SuggestionCarousel.ts";

const story = document.querySelector<HTMLLinkElement>('#story');
if (!story) throw new Error("Could not find story");

const storyUrl = story.href;

const storyResponse = await fetch(storyUrl);
if (!storyResponse.ok) throw new Error(`Failed to load story: ${storyResponse.status}`);
const storyData = new Uint8Array(await storyResponse.arrayBuffer());

const interpreter = interpreterFor(story.dataset.type) ?? detectFormat(storyUrl, storyData).interpreter;
console.log('[player] Interpreter:', interpreter, 'type:', story.dataset.type);

const app = LazyMap.create()
    .set('clock', constructor(SystemClock))
    .set('customElements', instance(window.customElements))
    .set('HTMLElement', instance(HTMLElement))
    .set('HTMLImageElement', instance(HTMLImageElement))
    .set('ImageElement', customElement(ImageElement))
    .set('Instruction', customElement(Instruction))
    .set('UserInput', customElement(UserInput))
    .set('GridWindow', customElement(GridWindow))
    .set('BufferWindow', customElement(BufferWindow))
    .set('InteractiveFiction', customElement(InteractiveFiction))
realise(app.ImageElement, app.Instruction, app.UserInput, app.GridWindow, app.BufferWindow, app.InteractiveFiction);

controlKeys(document);
observeCarousels(document);

document.addEventListener(InstructionEventName, (ev: Event) => {
    const {text, action} = (ev as CustomEvent<InstructionDetail>).detail;
    const input = document.querySelector('user-input') as any;
    if (!input) return;
    if (action === 'prefill') {
        input.setPrefix(text);
    } else {
        input.submitText(text);
    }
});

const ifEl = document.querySelector('interactive-fiction') as any
    ?? document.createElement('interactive-fiction');

if (!ifEl.parentElement) document.body.appendChild(ifEl);

const initialColumns = await measureInitialColumns(ifEl);

const client = await createClient({
    storyData,
    workerUrl: '/wasiglk/worker.js',
    interpreterUrl: `/wasiglk/${interpreter}.wasm`,
    filesystem: 'auto',
    metrics: {width: initialColumns, height: 24},
});

ifEl.run(client);

async function measureInitialColumns(container: HTMLElement): Promise<number> {
    await document.fonts.ready;

    const gridWindow = document.createElement('grid-window');
    const section = document.createElement('section');
    section.classList.add('card');
    const probe = document.createElement('span');
    probe.style.cssText = 'visibility:hidden;white-space:pre;';
    probe.textContent = '0';
    section.appendChild(probe);
    gridWindow.appendChild(section);
    container.appendChild(gridWindow);

    const available = section.clientWidth;
    const charWidth = probe.getBoundingClientRect().width;
    gridWindow.remove();

    if (charWidth === 0) return 80;
    return Math.floor(available / charWidth);
}

function interpreterFor(type: string | undefined): string | undefined {
    const map: Record<string, string> = {
        'zcode': 'fizmo',
        'blorb/zcode': 'fizmo',
        'glulx': 'glulxe',
        'blorb/glulx': 'glulxe',
        'hugo': 'hugo',
        'adrift': 'scare',
        'alan2': 'alan2',
        'alan3': 'alan3',
        'agt': 'agility',
        'advsys': 'advsys',
        'tads2': 'tads2',
        'tads3': 'tads3',
        'level9': 'level9',
    };
    return type ? map[type] : undefined;
}
