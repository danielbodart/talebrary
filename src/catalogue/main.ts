import {constructor, instance, LazyMap} from "@bodar/yadic/LazyMap.ts";
import {SystemClock} from "../system/clock.ts";
import {ImageElement} from "../components/ImageElement.ts";
import {type InstructionDetail, Instruction, InstructionEventName} from "../player/Instruction.ts";
import {customElement, realise} from "../components/misc.ts";
import {controlKeys} from "../player/controlKeys.ts";
import {treeToNodes} from "../player/SuggestionNodes.ts";
import {buildSuggestionList} from "../player/SuggestionList.ts";
import {observeCarousels} from "../player/SuggestionCarousel.ts";
import {Engine, type EngineView} from "@bodar/text-engine";
import {athenaeumDisk, type RoomMeta} from "./athenaeumDisk.ts";

const app = LazyMap.create()
    .set('clock', constructor(SystemClock))
    .set('customElements', instance(window.customElements))
    .set('HTMLElement', instance(HTMLElement))
    .set('HTMLImageElement', instance(HTMLImageElement))
    .set('ImageElement', customElement(ImageElement))
    .set('Instruction', customElement(Instruction));
realise(app.ImageElement, app.Instruction);

controlKeys(document);
observeCarousels(document);

const main = document.querySelector<HTMLElement>('main.catalogue')!;
const inputControl = main.querySelector<HTMLElement>('.input-control')!;
const form = inputControl.querySelector<HTMLFormElement>('form')!;
const input = form.querySelector<HTMLInputElement>('input')!;

// The engine is the single source of truth for navigation, dialogue and state.
// Seed from the engine's own room id so the two never drift apart (supports deep links).
const engine = new Engine(athenaeumDisk);
let currentRoomId = engine.goto(normalisePath(window.location.pathname)).roomId;

const inventoryText = 'You rummage through your pockets and produce:\n\n' +
    '• Some fluff — Origin unknown. Possibly sentient. Has been accumulating since at least last Tuesday.\n' +
    '• A button — Brass, slightly tarnished. You don\'t remember which coat it came from, but you\'ve been carrying it for years "just in case."\n' +
    '• An old sticky sweet — The wrapper has fused permanently to the candy. Any attempt at separation would be futile and probably dangerous.';

// Mirror resolveRoom's normalisation so URL → room id matches the engine's ids,
// including the optional /catalogue and /content prefixes.
function normalisePath(path: string): string {
    const segments = path.replace(/\/+$/, '').split('/').filter(Boolean);
    if (segments[0] === 'catalogue' || segments[0] === 'content') segments.shift();
    return '/' + segments.join('/');
}

/** Commands the engine drives in the Athenaeum; everything else is a collection search. */
function isNavigation(command: string): boolean {
    const first = command.split(/\s+/)[0];
    if (['go', 'look', 'talk', 'discuss'].includes(first)) return true;
    // a bare exit label typed directly, e.g. "genres"
    return engine.peek().exits.some(e => e.label.toLowerCase() === command);
}

function meta(view: EngineView): RoomMeta {
    return view.meta as unknown as RoomMeta;
}

function illustrationUrl(view: EngineView): string {
    return `/cards/art?prompt=${encodeURIComponent(JSON.stringify({
        story: {title: 'The Talebrary Athenaeum', description: 'A vast library of interactive fiction games'},
        scene: meta(view).illustration,
    }))}`;
}

/** Build the suggestion carousel panel from the engine's built-in, state-derived actions. */
function suggestionBar(view: EngineView): HTMLElement {
    const nav = buildSuggestionList(treeToNodes(view.suggestions)) as HTMLElement;
    nav.classList.add('nav');
    return nav;
}

function echoInput(text: string) {
    const section = document.createElement('section');
    section.classList.add('card');
    const div = document.createElement('div');
    div.className = 'input';
    div.textContent = text;
    section.appendChild(div);
    main.insertBefore(section, inputControl);
}

function appendSceneCard(view: EngineView) {
    const card = document.createElement('div');
    card.classList.add('card', 'scene-card', 'scroll');

    const img = document.createElement('img', {is: 'x-image'});
    img.setAttribute('is', 'x-image');
    img.setAttribute('reloadable', '');
    img.className = 'image';
    img.src = illustrationUrl(view);
    img.loading = 'eager';
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    card.appendChild(img);

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = view.title;
    card.appendChild(title);

    const narrative = document.createElement('div');
    narrative.className = 'normal';
    narrative.textContent = view.description;
    card.appendChild(narrative);

    card.appendChild(suggestionBar(view));
    main.insertBefore(card, inputControl);
}

/** A text card for command output (dialogue lines, look, take confirmations). */
function appendMessageCard(view: EngineView) {
    if (!view.messages.length) return;
    const card = document.createElement('div');
    card.classList.add('card', 'librarian-card', 'scroll');

    const normal = document.createElement('div');
    normal.className = 'normal';
    normal.textContent = view.messages.join('\n\n');
    card.appendChild(normal);

    card.appendChild(suggestionBar(view));
    main.insertBefore(card, inputControl);
}

function showInventoryCard() {
    const card = document.createElement('div');
    card.classList.add('card', 'librarian-card', 'scroll');

    const imgUrl = `/cards/art?prompt=${encodeURIComponent(JSON.stringify({
        story: {title: 'The Talebrary Athenaeum', description: 'A vast library of interactive fiction games'},
        scene: 'A handful of pocket treasures laid out on a dark wooden desk: a ball of grey lint, a tarnished brass button, and a sticky sweet with its wrapper fused on. Warm candlelight, still life.',
    }))}`;
    const img = document.createElement('img', {is: 'x-image'});
    img.setAttribute('is', 'x-image');
    img.setAttribute('reloadable', '');
    img.className = 'image';
    img.src = imgUrl;
    img.loading = 'eager';
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    card.appendChild(img);

    const normal = document.createElement('div');
    normal.className = 'normal';
    normal.textContent = inventoryText;
    card.appendChild(normal);
    main.insertBefore(card, inputControl);
}

async function loadGameCards(path: string) {
    main.querySelector('.window.buffer')?.remove();

    const resp = await fetch(path);
    if (!resp.ok) return;
    const html = await resp.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const buffer = doc.querySelector('.window.buffer');
    if (buffer) {
        buffer.classList.add('scroll');
        main.insertBefore(buffer, inputControl);
    }
    const librarian = doc.querySelector('.librarian-card');
    if (librarian) {
        librarian.classList.add('scroll');
        main.insertBefore(librarian, inputControl);
    }
}

function updateBreadcrumb(view: EngineView) {
    const old = main.querySelector('.breadcrumb');
    if (!old) return;
    const el = document.createElement('div');
    el.className = 'breadcrumb';
    const crumbs = meta(view).breadcrumb;
    crumbs.forEach((b, i) => {
        if (i > 0) {
            const sep = document.createElement('span');
            sep.className = 'sep';
            sep.textContent = '›';
            el.appendChild(sep);
        }
        const isLast = i === crumbs.length - 1;
        if (isLast || !b.item) {
            const span = document.createElement('span');
            span.className = 'current';
            span.textContent = b.name;
            el.appendChild(span);
        } else {
            const a = document.createElement('a');
            a.href = b.item;
            a.textContent = b.name;
            el.appendChild(a);
        }
    });
    old.replaceWith(el);
}

function scrollToLatest() {
    const scroll = main.querySelector<HTMLElement>('.scroll');
    if (scroll) {
        setTimeout(() => {
            scroll.scrollIntoView({block: 'start', behavior: 'smooth'});
            main.querySelectorAll('.scroll').forEach(e => e.classList.remove('scroll'));
        }, 100);
    }
}

/** Render an engine view: a new scene on room change, otherwise a message card. */
async function renderView(view: EngineView) {
    if (view.roomId !== currentRoomId) {
        currentRoomId = view.roomId;
        appendSceneCard(view);
        updateBreadcrumb(view);
        document.title = meta(view).pageTitle;
        history.pushState({path: view.roomId}, '', view.roomId);
        if (meta(view).gameQuery) await loadGameCards(view.roomId);
    } else {
        appendMessageCard(view);
    }
    scrollToLatest();
}

async function search(query: string) {
    await loadGameCards(`${currentRoomId}?search=${encodeURIComponent(query)}`);
    scrollToLatest();
}

// --- Instruction chip clicks ---

document.addEventListener(InstructionEventName, (ev: Event) => {
    const {text, action} = (ev as CustomEvent<InstructionDetail>).detail;
    if (action === 'prefill') {
        input.value = `${text} `;
        input.focus({preventScroll: true});
    } else {
        input.value = text;
        form.dispatchEvent(new SubmitEvent('submit'));
    }
});

// --- Form submit: engine-first, with a free-text search fallthrough ---

form.addEventListener('submit', async (ev: SubmitEvent) => {
    ev.preventDefault();

    const raw = input.value.trim();
    if (!raw) return;
    input.value = '';

    const command = raw.toLowerCase();

    // "ask librarian <query>" is a search, not a topic
    const librarianMatch = command.match(/^ask\s+librarian\s+(.+)$/);
    if (librarianMatch) {
        echoInput(raw);
        await search(librarianMatch[1]);
        return;
    }
    if (command === 'ask librarian') {
        input.value = 'ask librarian ';
        input.focus({preventScroll: true});
        return;
    }

    // Inventory is a themed card with its own illustration; keep engine state in sync.
    if (command === 'inventory' || command === 'inv') {
        echoInput(raw);
        engine.execute(command);
        showInventoryCard();
        scrollToLatest();
        return;
    }

    echoInput(raw);

    // Navigation and dialogue go to the engine; free text searches the collection.
    if (isNavigation(command)) {
        const view = engine.execute(raw);
        if (view.understood) {
            await renderView(view);
            return;
        }
    }

    await search(command.startsWith('ask ') ? command.slice(4) : raw);
});

// --- Browser back/forward ---

window.addEventListener('popstate', () => {
    window.location.reload();
});

// --- Initial scroll to the server-rendered scene ---

const scroll = main.querySelector<HTMLElement>('.card.scroll');
if (scroll) {
    setTimeout(() => {
        scroll.scrollIntoView({block: 'start', behavior: 'smooth'});
        main.querySelectorAll('.scroll').forEach(e => e.classList.remove('scroll'));
    }, 100);
}
