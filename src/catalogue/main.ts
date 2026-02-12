import {constructor, instance, LazyMap} from "@bodar/yadic/LazyMap.ts";
import {SystemClock} from "../system/clock.ts";
import {ImageElement} from "../components/ImageElement.ts";
import {type InstructionDetail, Instruction, InstructionEventName} from "../player/Instruction.ts";
import {Suggestions} from "../player/Suggestions.ts";
import {customElement, realise} from "../components/misc.ts";
import {controlKeys} from "../player/controlKeys.ts";
import {type Room, resolveRoom} from "./CatalogueConfig.ts";
import {treeToSuggestions} from "../player/PrefixTree.ts";
import {librarianTopics} from "./Librarian.ts";

const app = LazyMap.create()
    .set('clock', constructor(SystemClock))
    .set('customElements', instance(window.customElements))
    .set('HTMLElement', instance(HTMLElement))
    .set('HTMLImageElement', instance(HTMLImageElement))
    .set('ImageElement', customElement(ImageElement))
    .set('Instruction', customElement(Instruction))
    .set('Suggestions', customElement(Suggestions));
realise(app.ImageElement, app.Instruction, app.Suggestions);

controlKeys(document);

const main = document.querySelector<HTMLElement>('main.catalogue')!;
const inputControl = main.querySelector<HTMLElement>('.input-control')!;
const form = inputControl.querySelector<HTMLFormElement>('form')!;
const input = form.querySelector<HTMLInputElement>('input')!;

let activePrefix = '';

function getTopics(): Record<string, string> {
    const el = document.querySelector('.librarian-topics');
    if (!el?.textContent) return {};
    try { return JSON.parse(el.textContent); } catch { return {}; }
}

const topicMap = getTopics();

const inventoryText = 'You rummage through your pockets and produce:\n\n' +
    '\u2022 Some fluff \u2014 Origin unknown. Possibly sentient. Has been accumulating since at least last Tuesday.\n' +
    '\u2022 A button \u2014 Brass, slightly tarnished. You don\'t remember which coat it came from, but you\'ve been carrying it for years "just in case."\n' +
    '\u2022 An old sticky sweet \u2014 The wrapper has fused permanently to the candy. Any attempt at separation would be futile and probably dangerous.';

function illustrationUrl(room: Room): string {
    return `/cards/art?prompt=${encodeURIComponent(JSON.stringify({
        story: {title: 'The Talebrary Athenaeum', description: 'A vast library of interactive fiction games'},
        scene: room.illustration,
    }))}`;
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

function renderRoom(room: Room) {
    const card = document.createElement('div');
    card.classList.add('card', 'scene-card', 'scroll');

    const img = document.createElement('img', {is: 'x-image'});
    img.setAttribute('is', 'x-image');
    img.setAttribute('reloadable', '');
    img.className = 'image';
    img.src = illustrationUrl(room);
    img.loading = 'eager';
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    card.appendChild(img);

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = room.title;
    card.appendChild(title);

    const narrative = document.createElement('div');
    narrative.className = 'normal';
    narrative.textContent = room.narrative;
    card.appendChild(narrative);

    const tree: Record<string, string[]> = {
        go: room.exits.map(e => e.label),
        ask: [...librarianTopics.map(t => t.id), 'librarian'],
        look: [],
        inventory: [],
    };
    const suggestions = treeToSuggestions(tree);

    const nav = document.createElement('div');
    nav.className = 'suggestions nav';
    for (const s of suggestions) {
        const el = document.createElement('x-instruction');
        el.textContent = s.text;
        if (s.completions.length > 0) el.dataset.completions = JSON.stringify(s.completions);
        nav.appendChild(el);
    }
    for (const exit of room.exits) {
        const a = document.createElement('a');
        a.href = exit.path;
        a.className = 'hidden';
        a.textContent = `go ${exit.label}`;
        nav.appendChild(a);
    }
    card.appendChild(nav);

    main.insertBefore(card, inputControl);
}

function showLibrarianCard(text: string) {
    const card = document.createElement('div');
    card.classList.add('card', 'librarian-card', 'scroll');
    const normal = document.createElement('div');
    normal.className = 'normal';
    normal.textContent = text;
    card.appendChild(normal);
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
    // Remove any existing game card buffer
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

function updateBreadcrumb(room: Room) {
    const old = main.querySelector('.breadcrumb');
    if (!old) return;
    const el = document.createElement('div');
    el.className = 'breadcrumb';
    room.breadcrumb.forEach((b, i) => {
        if (i > 0) {
            const sep = document.createElement('span');
            sep.className = 'sep';
            sep.textContent = '\u203A';
            el.appendChild(sep);
        }
        const isLast = i === room.breadcrumb.length - 1;
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

function clearCompletions() {
    inputControl.querySelector('.completions')?.remove();
}

function showCompletions(completions: string[]) {
    clearCompletions();
    const container = document.createElement('div');
    container.className = 'completions';
    for (const word of completions) {
        const el = document.createElement('x-instruction');
        el.textContent = word;
        container.appendChild(el);
    }
    inputControl.insertBefore(container, inputControl.firstChild);
}

function findExit(label: string): {path: string; label: string} | undefined {
    const links = main.querySelectorAll<HTMLAnchorElement>('.suggestions.nav a[href]');
    for (const link of links) {
        const linkText = link.textContent?.trim().toLowerCase() ?? '';
        if (linkText === `go ${label}` || linkText === label) {
            return {path: new URL(link.href).pathname, label};
        }
    }
    return undefined;
}

// --- Instruction event handler (same pattern as player) ---

document.addEventListener(InstructionEventName, (ev: Event) => {
    const {text, partial, completions} = (ev as CustomEvent<InstructionDetail>).detail;

    if (partial) {
        activePrefix = text;
        if (completions.length > 0) {
            showCompletions(completions);
        } else {
            clearCompletions();
            input.value = `${text} `;
            input.focus({preventScroll: true});
        }
    } else {
        clearCompletions();
        if (activePrefix) {
            input.value = `${activePrefix} ${text}`;
        } else {
            input.value = text;
        }
        form.dispatchEvent(new SubmitEvent('submit'));
    }
});

// --- Form submit handler ---

form.addEventListener('submit', async (ev: SubmitEvent) => {
    ev.preventDefault();

    const raw = input.value.trim();
    if (!raw) return;

    input.value = '';
    clearCompletions();

    const command = raw.toLowerCase();
    activePrefix = '';

    // go <exit>
    const goMatch = command.match(/^go\s+(.+)$/);
    if (goMatch) {
        const target = goMatch[1];
        const exit = findExit(target);
        if (exit) {
            echoInput(raw);
            const room = resolveRoom(exit.path);
            if (room) {
                renderRoom(room);
                updateBreadcrumb(room);
                document.title = room.pageTitle;
                history.pushState({path: exit.path}, '', exit.path);
                if (room.gameQuery) {
                    await loadGameCards(exit.path);
                }
                scrollToLatest();
            }
            return;
        }
    }

    // look → re-render current room
    if (command === 'look') {
        echoInput(raw);
        const room = resolveRoom(window.location.pathname);
        if (room) {
            renderRoom(room);
            scrollToLatest();
        }
        return;
    }

    // inventory → humorous inventory card with AI illustration
    if (command === 'inventory') {
        echoInput(raw);
        showInventoryCard();
        scrollToLatest();
        return;
    }

    // ask <known-topic>
    const askMatch = command.match(/^ask\s+(.+)$/);
    if (askMatch) {
        const topic = topicMap[askMatch[1]];
        if (topic) {
            echoInput(raw);
            showLibrarianCard(topic);
            scrollToLatest();
            return;
        }
    }

    // ask librarian <query> → search for <query>
    const librarianMatch = command.match(/^ask\s+librarian\s+(.+)$/);
    if (librarianMatch) {
        echoInput(raw);
        await loadGameCards(`${window.location.pathname}?search=${encodeURIComponent(librarianMatch[1])}`);
        scrollToLatest();
        return;
    }

    // ask librarian (exact) → set input prefix, no echo
    if (command === 'ask librarian') {
        input.value = 'ask librarian ';
        input.focus({preventScroll: true});
        return;
    }

    // ask <unknown> → search stripping "ask "
    if (command.startsWith('ask ')) {
        echoInput(raw);
        await loadGameCards(`${window.location.pathname}?search=${encodeURIComponent(command.slice(4))}`);
        scrollToLatest();
        return;
    }

    // anything else → search as-is
    echoInput(raw);
    await loadGameCards(`${window.location.pathname}?search=${encodeURIComponent(raw)}`);
    scrollToLatest();
});

// --- Browser back/forward ---

window.addEventListener('popstate', () => {
    window.location.reload();
});

// --- Initial scroll ---

const scroll = main.querySelector<HTMLElement>('.card.scroll');
if (scroll) {
    setTimeout(() => {
        scroll.scrollIntoView({block: 'start', behavior: 'smooth'});
        main.querySelectorAll('.scroll').forEach(e => e.classList.remove('scroll'));
    }, 100);
}
