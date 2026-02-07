import {type InstructionDetail, Instruction, InstructionEventName} from "../player/Instruction.ts";

customElements.define('x-instruction', Instruction);

let activePrefix = '';

document.addEventListener(InstructionEventName, (ev: Event) => {
    const {text, partial} = (ev as CustomEvent<InstructionDetail>).detail;
    if (!partial) return;
    activePrefix = text;
    const input = document.querySelector<HTMLInputElement>('.input-control input');
    if (!input) return;
    input.value = `${text} `;
    input.focus({preventScroll: true});
});

const form = document.querySelector<HTMLFormElement>('.input-control form');
form?.addEventListener('submit', (ev: SubmitEvent) => {
    const input = form.querySelector<HTMLInputElement>('input');
    if (!input) return;

    const raw = input.value.trim();

    if (activePrefix && raw.toLowerCase().startsWith(activePrefix.toLowerCase())) {
        input.value = raw.slice(activePrefix.length).trim();
    }

    const goMatch = raw.match(/^go\s+(.+)$/i);
    if (goMatch) {
        const target = goMatch[1].toLowerCase();
        const links = document.querySelectorAll<HTMLAnchorElement>('.suggestions.nav a[href]');
        for (const link of links) {
            const linkText = link.textContent?.trim().toLowerCase() ?? '';
            if (linkText === `go ${target}` || linkText === target) {
                ev.preventDefault();
                window.location.href = link.href;
                return;
            }
        }
    }
});
