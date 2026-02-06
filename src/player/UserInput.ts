import type {InputRequestClientUpdate} from "@bodar/wasiglk";
import {AdjustKeys} from "./KeyMapping.ts";
import {commands} from "../types.ts";

export class UserInput extends HTMLElement {
    private inputEl: HTMLInputElement | null = null;
    private sendInput: ((value: string) => void) | null = null;

    configure(update: InputRequestClientUpdate, sendInput: (value: string) => void) {
        this.sendInput = sendInput;
        this.classList.add('card', 'input-control');

        const form = document.createElement('form');
        form.className = 'input';

        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = update.maxLength ?? (update.inputType === 'char' ? 1 : 256);
        input.value = update.initial ?? '';
        input.placeholder = update.inputType === 'char' ? 'press key' : '';
        input.setAttribute('list', 'input-history');

        const datalist = document.createElement('datalist');
        datalist.id = 'input-history';

        const history = Array.from(this.closest('buffer-window')?.querySelectorAll<HTMLElement>('div.input') ?? [])
            .flatMap(e => e.innerText.split(/\s+/));
        const auto = Array.from(new Set([...commands, ...history])).sort();
        for (const item of auto) {
            const option = document.createElement('option');
            option.value = item;
            datalist.appendChild(option);
        }

        form.appendChild(input);
        form.appendChild(datalist);
        this.appendChild(form);

        this.inputEl = input;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submit(input.value);
            input.value = '';
        });

        // Android: keydown e.key returns 'Unidentified', so use input event for char mode
        input.addEventListener('input', (e) => {
            if (update.inputType !== 'char') return;
            e.preventDefault();
            this.submit(input.value);
            input.value = '';
        });

        input.addEventListener('keydown', (e) => {
            if (update.inputType !== 'char' || e.key === 'Unidentified') return;
            e.preventDefault();
            this.submit(AdjustKeys[e.key] ?? e.key);
        });
    }

    private submit(value: string) {
        this.sendInput?.(value);
    }

    appendText(text: string) {
        if (this.inputEl) {
            this.inputEl.value = `${this.inputEl.value} ${text}`.trim();
            this.inputEl.form?.dispatchEvent(new SubmitEvent('submit'));
        }
    }

    override focus() {
        this.inputEl?.focus({preventScroll: true});
    }
}
