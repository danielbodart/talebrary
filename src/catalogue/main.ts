import {constructor, instance, LazyMap} from "@bodar/yadic/LazyMap.ts";
import {SystemClock} from "../system/clock.ts";
import {ImageElement} from "../components/ImageElement.ts";
import {type InstructionDetail, Instruction, InstructionEventName} from "../player/Instruction.ts";
import {customElement, realise} from "../components/misc.ts";
import {controlKeys} from "../player/controlKeys.ts";
import {buildSuggestionList} from "../player/SuggestionList.ts";
import {observeCarousels} from "../player/SuggestionCarousel.ts";
import {Engine, type EngineView, type SuggestionNode, type ViewItem} from "@bodar/dullahan";
import {athenaeumDisk, type RoomMeta} from "./athenaeumDisk.ts";
import type {Describable} from "../types.ts";

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

// Mirror resolveRoom's normalisation so URL → room id matches the engine's ids,
// including the optional /catalogue and /content prefixes.
function normalisePath(path: string): string {
    const segments = path.replace(/\/+$/, '').split('/').filter(Boolean);
    if (segments[0] === 'catalogue' || segments[0] === 'content') segments.shift();
    return '/' + segments.join('/');
}

function meta(view: EngineView): RoomMeta {
    return view.meta as unknown as RoomMeta;
}

function artUrl(scene: Describable): string {
    return `/cards/art?prompt=${encodeURIComponent(JSON.stringify({
        story: {title: 'The Talebrary Athenaeum', description: 'A vast library of interactive fiction games'},
        scene,
    }))}`;
}

function sceneImage(scene: Describable): HTMLImageElement {
    const img = document.createElement('img', {is: 'x-image'});
    img.setAttribute('is', 'x-image');
    img.setAttribute('reloadable', '');
    img.className = 'image';
    img.src = artUrl(scene);
    img.loading = 'eager';
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    return img;
}

/** Build a suggestion carousel panel from the given nodes. */
function navPanel(nodes: SuggestionNode[]): HTMLElement {
    const nav = buildSuggestionList(nodes) as HTMLElement;
    nav.classList.add('nav');
    return nav;
}

/** A verb over items. Chips mirror the raw command (parser noun), not the display
 *  name — a leaf's label IS its command, a group's children are the bare nouns. */
function itemActionGroup(verb: string, items: ViewItem[]): SuggestionNode {
    if (items.length === 1) return {label: `${verb} ${items[0].name}`, command: `${verb} ${items[0].name}`, action: 'submit'};
    return {label: `${verb}…`, children: items.map(i => ({label: i.name, command: `${verb} ${i.name}`, action: 'submit'}))};
}

/** Item-context actions for the inventory / examine cards — just examine and drop.
 *  look / inventory live on the default panel, so no "back" chip is needed here. */
function inventoryActions(items: ViewItem[], focusName?: string): SuggestionNode[] {
    const nodes: SuggestionNode[] = [];
    if (focusName) {
        const focused = items.find(i => i.name === focusName);
        const others = items.filter(i => i.name !== focusName);
        if (others.length) nodes.push(itemActionGroup('examine', others));
        if (focused) nodes.push({label: `drop ${focused.name}`, command: `drop ${focused.name}`, action: 'submit'});
    } else if (items.length) {
        nodes.push(itemActionGroup('examine', items));
        nodes.push(itemActionGroup('drop', items));
    }
    return nodes;
}

/** A verb over bare nouns: collapsed leaf for one, drill-in group for several. */
function commandGroup(verb: string, names: string[]): SuggestionNode {
    if (names.length === 1) return {label: `${verb} ${names[0]}`, command: `${verb} ${names[0]}`, action: 'submit'};
    return {label: `${verb}…`, children: names.map(n => ({label: n, command: `${verb} ${n}`, action: 'submit'}))};
}

/** Actions on an examined character — talk to them, or ask them to find something. */
function characterActions(name: string): SuggestionNode[] {
    return [
        {label: `talk ${name}`, command: `talk ${name}`, action: 'submit'},
        {label: 'find', command: 'find', action: 'prefill'},
    ];
}

/** Natural-language list join: "a, b and c". */
function joinList(items: string[]): string {
    if (items.length <= 1) return items.join('');
    return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
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

/** A scene card: optional illustration + title + description + suggestions.
 *  Used for both rooms and examined items/characters — they differ only in content. */
function appendCard(content: {title: string; description: string; illustration?: Describable; items?: string[]}, nodes: SuggestionNode[]) {
    const card = document.createElement('div');
    card.classList.add('card', 'scene-card', 'scroll');
    if (content.illustration) card.appendChild(sceneImage(content.illustration));

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = content.title;
    card.appendChild(title);

    const desc = document.createElement('div');
    desc.className = 'normal';
    desc.textContent = content.description;
    card.appendChild(desc);

    // Anything left in the room (e.g. an item you dropped here earlier).
    if (content.items?.length) {
        const here = document.createElement('div');
        here.className = 'normal';
        here.textContent = `You can see ${joinList(content.items)} here.`;
        card.appendChild(here);
    }

    card.appendChild(navPanel(nodes));
    main.insertBefore(card, inputControl);
}

/** The full scene for the current room: illustration, title, description, contents, actions. */
function appendScene(view: EngineView) {
    appendCard({
        title: view.title,
        description: view.description,
        illustration: meta(view).illustration,
        items: view.items.map(i => i.display),
    }, view.suggestions);
}

/** A text card for command output (dialogue lines, take confirmations). */
function appendMessageCard(view: EngineView) {
    if (!view.messages.length) return;
    const card = document.createElement('div');
    card.classList.add('card', 'librarian-card', 'scroll');

    const normal = document.createElement('div');
    normal.className = 'normal';
    normal.textContent = view.messages.join('\n\n');
    card.appendChild(normal);

    card.appendChild(navPanel(view.suggestions));
    main.insertBefore(card, inputControl);
}

/** A conversation card: the character's line, a real list of topics, and the
 *  discuss/find/back actions. Leaving is the back chip (no "nothing" in the list). */
function appendDialogueCard(view: EngineView) {
    const convo = view.conversation!;
    const card = document.createElement('div');
    card.classList.add('card', 'librarian-card', 'scroll');

    // The character's spoken line(s). The engine also emits a bullet list + prompt,
    // which we render as a proper list below — so filter those out here.
    const spoken = view.messages.filter(m => !m.startsWith('•') && m !== 'What would you like to discuss?');
    for (const line of spoken) {
        const d = document.createElement('div');
        d.className = 'normal';
        d.textContent = line;
        card.appendChild(d);
    }

    const prompt = document.createElement('div');
    prompt.className = 'normal';
    prompt.textContent = 'What would you like to discuss?';
    card.appendChild(prompt);

    const list = document.createElement('ul');
    list.className = 'topics-list';
    for (const t of convo.topics) {
        const li = document.createElement('li');
        li.textContent = t.option;
        list.appendChild(li);
    }
    card.appendChild(list);

    const nodes: SuggestionNode[] = [
        {label: '‹', command: 'bye', action: 'submit'},
        commandGroup('discuss', convo.topics.map(t => t.keyword)),
        {label: 'find', command: 'find', action: 'prefill'},
    ];
    card.appendChild(navPanel(nodes));
    main.insertBefore(card, inputControl);
}

/** The inventory as a real list, with an examine action per item (a small surprise). */
function showInventory() {
    const view = engine.execute('inventory');
    const card = document.createElement('div');
    card.classList.add('card', 'librarian-card', 'scroll');

    const intro = document.createElement('div');
    intro.className = 'normal';
    intro.textContent = 'You rummage through your pockets and find:';
    card.appendChild(intro);

    const list = document.createElement('ul');
    list.className = 'inventory-list';
    for (const item of view.inventory) {
        const li = document.createElement('li');
        li.textContent = item.display;
        list.appendChild(li);
    }
    card.appendChild(list);

    card.appendChild(navPanel(inventoryActions(view.inventory)));
    main.insertBefore(card, inputControl);
}

async function loadGameCards(path: string) {
    main.querySelector('.window.buffer')?.remove();

    const resp = await fetch(path);
    if (!resp.ok) return;
    const html = await resp.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    // Librarian's remark comes first, then the results he found.
    const librarian = doc.querySelector('.librarian-card');
    if (librarian) {
        librarian.classList.add('scroll');
        main.insertBefore(librarian, inputControl);
    }
    const buffer = doc.querySelector('.window.buffer');
    if (buffer) {
        buffer.classList.add('scroll');
        main.insertBefore(buffer, inputControl);
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

/** Render an engine view: a focus card when examining, a new scene on room change, else a message. */
async function renderView(view: EngineView) {
    if (view.focus) {
        const illustration = (view.focus.meta as {illustration?: Describable} | undefined)?.illustration;
        // Examining an item/character keeps its own context, not the room's nav.
        const invItem = view.inventory.find(i => i.display === view.focus!.title);
        const nodes = invItem ? inventoryActions(view.inventory, invItem.name)
            : view.characters.includes(view.focus.title) ? characterActions(view.focus.title)
            : view.suggestions;
        appendCard({title: view.focus.title, description: view.focus.description, illustration}, nodes);
        scrollToLatest();
        return;
    }
    if (view.conversation) {
        appendDialogueCard(view);
        scrollToLatest();
        return;
    }
    if (view.roomId !== currentRoomId) {
        currentRoomId = view.roomId;
        appendScene(view);
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

    // find <query> — advertised by the engine, executed here as a (contextual) search.
    const findMatch = command.match(/^find\s+(.+)$/);
    if (findMatch) {
        echoInput(raw);
        await search(findMatch[1]);
        return;
    }
    if (command === 'find') {
        input.value = 'find ';
        input.focus({preventScroll: true});
        return;
    }

    // Inventory: a real list you can examine item by item.
    if (command === 'inventory' || command === 'inv') {
        echoInput(raw);
        showInventory();
        scrollToLatest();
        return;
    }

    // look: re-render the full current scene (not just the description line).
    if (command === 'look' || command === 'l') {
        echoInput(raw);
        appendScene(engine.execute('look'));
        scrollToLatest();
        return;
    }

    // Everything else → the engine: navigation, dialogue, examine, or an
    // unknown-command reply that lists the valid commands (no silent search fallthrough).
    echoInput(raw);
    await renderView(engine.execute(raw));
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
