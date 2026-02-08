import {CustomElementDefinition} from "../components/CustomElementDefinition.ts";

export const InstructionEventName = 'instruction';

export interface InstructionDetail {
    text: string;
    partial: boolean;
    completions: string[];
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
                    const raw = this.textContent ?? '';
                    const partial = raw.endsWith('...');
                    const text = partial ? raw.slice(0, -3).trim() : raw;
                    const completions = JSON.parse(this.dataset.completions ?? '[]');
                    this.dispatchEvent(new CustomEvent<InstructionDetail>(InstructionEventName, {
                        bubbles: true,
                        detail: {text, partial, completions},
                    }));
                });
            }
        });
    }
}
