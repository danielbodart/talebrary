/**
 * Horizontal paging for suggestion panels: shows only whole chips that fit,
 * clipping the rest, and drives one unified pair of nav arrows. The left arrow
 * pages back if the row was paged, otherwise drills back out to the parent
 * level; the right arrow pages forward. Drill-in / reveal stays pure CSS.
 */

const GAP = 6;        // matches .suggestions gap
const ICON = 32;      // lightbulb gutter (::before flex-basis + margin)
const ARROW = 30 + GAP;

/**
 * Greedy: from `start`, how many consecutive chips (with gaps) fit in `avail`?
 * Returns the exclusive end index (always at least one chip past start).
 */
export function fitWindow(widths: number[], gap: number, avail: number, start: number): number {
    let used = 0;
    let i = start;
    for (; i < widths.length; i++) {
        const w = widths[i] + (i > start ? gap : 0);
        if (i > start && used + w > avail) break;
        used += w;
    }
    return Math.min(Math.max(i, start + 1), widths.length);
}

interface State {
    offset: number;
    stack: number[];   // page-start offsets, for stepping back
    end: number;
    prev: HTMLButtonElement;
    next: HTMLButtonElement;
}

const states = new WeakMap<HTMLElement, State>();

export function observeCarousels(root: Document = document): void {
    const initAll = (host: ParentNode) =>
        host.querySelectorAll<HTMLElement>('.suggestions').forEach(init);

    initAll(root);

    new MutationObserver(mutations => {
        for (const m of mutations) {
            m.addedNodes.forEach(node => {
                if (!(node instanceof HTMLElement)) return;
                if (node.matches('.suggestions')) init(node);
                initAll(node);
            });
        }
    }).observe(root.body, {childList: true, subtree: true});

    // User drilled in (clicked a group's toggle) — the checkbox fires change.
    root.addEventListener('change', event => {
        const target = event.target as HTMLElement;
        if (!target.classList?.contains('drill')) return;
        const panel = target.closest<HTMLElement>('.suggestions');
        if (panel) reset(panel);
    });

    let raf = 0;
    window.addEventListener('resize', () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() =>
            root.querySelectorAll<HTMLElement>('.suggestions').forEach(reset));
    });
}

function init(panel: HTMLElement): void {
    if (states.has(panel)) return;
    const prev = arrow('prev', '‹', () => onPrev(panel));
    const next = arrow('next', '›', () => onNext(panel));
    panel.append(prev, next);
    states.set(panel, {offset: 0, stack: [], end: 0, prev, next});
    layout(panel);
}

function arrow(kind: 'prev' | 'next', glyph: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `pager ${kind}`;
    button.textContent = glyph;
    button.addEventListener('click', onClick);
    return button;
}

function reset(panel: HTMLElement): void {
    const state = states.get(panel);
    if (!state) return;
    state.offset = 0;
    state.stack = [];
    layout(panel);
}

function activeLevel(panel: HTMLElement): HTMLElement {
    const checked = panel.querySelectorAll<HTMLInputElement>('.drill:checked');
    if (checked.length === 0) return panel;
    const group = checked[checked.length - 1].closest('.node.group')!;
    return group.querySelector<HTMLElement>(':scope > .children')!;
}

function levelChips(level: HTMLElement): HTMLElement[] {
    return Array.from(level.children)
        .filter(li => li.classList.contains('node'))
        .map(li => li.querySelector<HTMLElement>(':scope > .chip'))
        .filter((chip): chip is HTMLElement => chip != null);
}

function layout(panel: HTMLElement): void {
    const state = states.get(panel);
    if (!state) return;

    const chips = levelChips(activeLevel(panel));
    chips.forEach(chip => {
        chip.classList.remove('clip');
        chip.style.marginLeft = '';
        chip.style.marginRight = '';
        chip.style.flexGrow = '0';   // measure natural width, not the stretched width
    });
    const widths = chips.map(chip => chip.getBoundingClientRect().width);
    chips.forEach(chip => (chip.style.flexGrow = ''));

    const style = getComputedStyle(panel);
    const content = panel.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const drilled = panel.querySelector('.drill:checked') != null;

    if (state.offset >= chips.length) state.offset = Math.max(0, chips.length - 1);
    const showPrev = drilled || state.stack.length > 0;

    let avail = content - ICON - (showPrev ? ARROW : 0);
    let end = fitWindow(widths, GAP, avail, state.offset);
    let showNext = end < chips.length;
    if (showNext) {
        avail -= ARROW;
        end = fitWindow(widths, GAP, avail, state.offset);
        showNext = end < chips.length;
    }
    state.end = end;

    chips.forEach((chip, i) => chip.classList.toggle('clip', i < state.offset || i >= end));
    // Reserve real space for the overlay arrows so chips don't slide under them.
    if (showPrev) chips[state.offset].style.marginLeft = `${ARROW}px`;
    if (showNext) chips[end - 1].style.marginRight = `${ARROW}px`;
    state.prev.style.display = showPrev ? '' : 'none';
    state.next.style.display = showNext ? '' : 'none';
}

function onNext(panel: HTMLElement): void {
    const state = states.get(panel);
    if (!state) return;
    state.stack.push(state.offset);
    state.offset = state.end;
    layout(panel);
}

function onPrev(panel: HTMLElement): void {
    const state = states.get(panel);
    if (!state) return;
    if (state.stack.length > 0) {
        state.offset = state.stack.pop()!;
        layout(panel);
        return;
    }
    // At the first page — go back out to the parent level.
    const checked = panel.querySelectorAll<HTMLInputElement>('.drill:checked');
    if (checked.length === 0) return;
    checked[checked.length - 1].checked = false;   // programmatic: no change event
    reset(panel);
}
