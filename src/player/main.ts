import {createClient, detectFormat, measureMetrics, type Metrics} from "@bodar/wasiglk";
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

const initialMetrics = await measureInitialMetrics(ifEl);

const gameId = new URL(storyUrl).pathname.split('/')[2] ?? storyUrl;

const client = await createClient({
    storyData,
    workerUrl: '/wasiglk/worker.js',
    interpreterUrl: `/wasiglk/${interpreter}.wasm`,
    filesystem: 'auto',
    metrics: initialMetrics,
    recordTranscript: true,
    transcriptLabel: gameId,
});

ifEl.run(client);
captureTranscript(client);

// Forward each transcript batch to /events as it arrives. Runs concurrently
// with ifEl.run (which drives client.updates()) — transcript() requires that.
// sendBeacon for now; revisit if batches hit the ~64KB cap.
async function captureTranscript(client: import("@bodar/wasiglk").WasiGlkClient) {
    let seq = 0;
    for await (const batch of client.transcript()) {
        if (batch.length === 0) continue;
        const seqStart = seq;
        seq += batch.length;
        navigator.sendBeacon('/events', JSON.stringify({stanzas: batch, seqStart}));
    }
}

// The game's windows don't exist until the interpreter starts, so build
// throwaway grid + buffer windows styled exactly like the real ones (the CSS
// keys off `interactive-fiction grid-window section` etc.) and let measureMetrics
// probe them for real pixel + character metrics. Height comes from the viewport
// (documentElement): the container is `display:inline` so its own height is 0.
async function measureInitialMetrics(container: HTMLElement): Promise<Metrics> {
    await document.fonts.ready;

    const grid = document.createElement('grid-window');
    const gridSection = document.createElement('section');
    gridSection.classList.add('card');
    grid.appendChild(gridSection);

    const buffer = document.createElement('buffer-window');
    const bufferSection = document.createElement('section');
    bufferSection.classList.add('card');
    buffer.appendChild(bufferSection);

    container.append(grid, buffer);
    const metrics = measureMetrics({area: document.documentElement, grid: gridSection, buffer: bufferSection});
    grid.remove();
    buffer.remove();
    return metrics;
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
        'scott': 'scott',
        'jacl': 'jacl',
    };
    return type ? map[type] : undefined;
}
