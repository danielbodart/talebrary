import {CustomElementDefinition} from "../components/CustomElementDefinition.ts";

export const InstructionEventName = 'instruction';

export interface InstructionDetail {
    /** The command text to act on — the full precomputed command for panel chips. */
    text: string;
    /** 'submit' runs the command; 'prefill' fills the input and waits for a typed noun. */
    action: 'submit' | 'prefill';
}

interface InstructionDeps {
    HTMLElement: typeof HTMLElement;
}

export class Instruction {
    static definition({HTMLElement}: InstructionDeps) {
        return new CustomElementDefinition('x-instruction', class extends HTMLElement {
            constructor() {
                super();
                this.addEventListener('click', () => {
                    // Panel chips carry the resolved command; inline narrative words fall back to their text.
                    const text = this.dataset.command ?? this.textContent ?? '';
                    const action = this.dataset.action === 'prefill' ? 'prefill' : 'submit';
                    this.dispatchEvent(new CustomEvent<InstructionDetail>(InstructionEventName, {
                        bubbles: true,
                        detail: {text, action},
                    }));
                });
            }
        });
    }
}
