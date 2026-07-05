import type {InputRequest} from "@bodar/wasiglk";
import {AdjustKeys} from "./KeyMapping.ts";
import {CustomElementDefinition} from "../components/CustomElementDefinition.ts";
import {buildSuggestionList} from "./SuggestionList.ts";
import {defaultSuggestions} from "./SuggestionNodes.ts";

interface UserInputDeps {
    HTMLElement: typeof HTMLElement;
}

export class UserInput {
    static definition({HTMLElement}: UserInputDeps) {
        return new CustomElementDefinition('user-input', class extends HTMLElement {
            private inputEl: HTMLInputElement | null = null;
            private sendInput: ((value: string) => void) | null = null;

            configure(update: InputRequest, sendInput: (value: string) => void) {
                this.sendInput = sendInput;
                this.classList.add('card', 'input-control');

                // Always-visible default suggestion panel (its own independent nav state).
                if (update.type !== 'char') {
                    this.appendChild(buildSuggestionList(defaultSuggestions()));
                }

                const form = document.createElement('form');
                form.className = 'input';

                const input = document.createElement('input');
                input.type = 'text';
                input.maxLength = update.maxlen ?? (update.type === 'char' ? 1 : 256);
                input.value = update.initial ?? '';
                input.placeholder = update.type === 'char' ? 'press key' : '';

                form.appendChild(input);
                this.appendChild(form);

                this.inputEl = input;

                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.submit(input.value);
                    input.value = '';
                });

                // Android: keydown e.key returns 'Unidentified', so use input event for char mode
                input.addEventListener('input', (e) => {
                    if (update.type !== 'char') return;
                    e.preventDefault();
                    this.submit(input.value);
                    input.value = '';
                });

                input.addEventListener('keydown', (e) => {
                    if (update.type !== 'char' || e.key === 'Unidentified') return;
                    e.preventDefault();
                    this.submit(AdjustKeys[e.key] ?? e.key);
                });
            }

            private submit(value: string) {
                this.sendInput?.(value);
            }

            submitText(text: string) {
                if (this.inputEl) {
                    this.inputEl.value = text;
                    this.inputEl.form?.dispatchEvent(new SubmitEvent('submit'));
                }
            }

            setPrefix(text: string) {
                if (this.inputEl) {
                    this.inputEl.value = `${text} `;
                    this.inputEl.focus({preventScroll: true});
                }
            }

            focus() {
                this.inputEl?.focus({preventScroll: true});
            }
        });
    }
}
