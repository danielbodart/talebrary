import type {InputRequestClientUpdate} from "@bodar/wasiglk";
import {AdjustKeys} from "./KeyMapping.ts";

export class UserInput extends HTMLElement {
    private inputEl: HTMLInputElement | null = null;
    private sendInput: ((value: string) => void) | null = null;
    private completionsEl: HTMLElement | null = null;

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

        form.appendChild(input);
        this.appendChild(form);

        this.inputEl = input;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submit(input.value);
            input.value = '';
            this.clearCompletions();
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

    setPrefix(text: string, completions: string[] = []) {
        if (this.inputEl) {
            this.inputEl.value = `${text} `;
            this.inputEl.focus({preventScroll: true});
        }
        if (completions.length > 0) {
            this.showCompletions(completions);
        } else {
            this.clearCompletions();
        }
    }

    private showCompletions(completions: string[]) {
        this.clearCompletions();
        const container = document.createElement('div');
        container.className = 'completions';
        for (const word of completions) {
            const el = document.createElement('x-instruction');
            el.textContent = word;
            container.appendChild(el);
        }
        this.insertBefore(container, this.firstChild);
        this.completionsEl = container;
    }

    private clearCompletions() {
        this.completionsEl?.remove();
        this.completionsEl = null;
    }

    override focus() {
        this.inputEl?.focus({preventScroll: true});
    }
}
