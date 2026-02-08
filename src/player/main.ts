import {createClient, detectFormat} from "@bodar/wasiglk";
import {InteractiveFiction} from "./InteractiveFiction.ts";
import {BufferWindow} from "./BufferWindow.ts";
import {GridWindow} from "./GridWindow.ts";
import {UserInput} from "./UserInput.ts";
import {Suggestions} from "./Suggestions.ts";
import {ImageElement} from "./ImageElement.ts";
import {type InstructionDetail, Instruction, InstructionEventName} from "./Instruction.ts";
import {controlKeys} from "./controlKeys.ts";

const story = document.querySelector<HTMLLinkElement>('#story');
if (!story) throw new Error("Could not find story");

const storyUrl = story.href;

const storyResponse = await fetch(storyUrl);
if (!storyResponse.ok) throw new Error(`Failed to load story: ${storyResponse.status}`);
const storyData = new Uint8Array(await storyResponse.arrayBuffer());

// Use server-provided game type when available, fall back to auto-detection
const interpreter = interpreterFor(story.dataset.type) ?? detectFormat(storyUrl, storyData).interpreter;
console.log('[player] Interpreter:', interpreter, 'type:', story.dataset.type);

customElements.define('x-image', ImageElement, {extends: 'img'});
customElements.define('x-instruction', Instruction);
customElements.define('x-suggestions', Suggestions);
customElements.define('user-input', UserInput);
customElements.define('grid-window', GridWindow);
customElements.define('buffer-window', BufferWindow);
customElements.define('interactive-fiction', InteractiveFiction);

const ifEl = document.querySelector<InteractiveFiction>('interactive-fiction')
    ?? document.createElement('interactive-fiction') as InteractiveFiction;

if (!ifEl.parentElement) document.body.appendChild(ifEl);

document.addEventListener(InstructionEventName, (ev: Event) => {
    const {text, partial, completions} = (ev as CustomEvent<InstructionDetail>).detail;
    const input = document.querySelector<UserInput>('user-input');
    if (!input) return;
    if (partial) {
        input.setPrefix(text, completions);
    } else {
        input.appendText(text);
    }
});

controlKeys(document);

const client = await createClient({
    storyData,
    workerUrl: '/wasiglk/worker.js',
    interpreterUrl: `/wasiglk/${interpreter}.wasm`,
    filesystem: 'auto',
    metrics: {width: 80, height: 24},
});

ifEl.run(client);

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
    };
    return type ? map[type] : undefined;
}
