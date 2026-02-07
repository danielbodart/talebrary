export const InstructionEventName = 'instruction';

export interface InstructionDetail {
    text: string;
    partial: boolean;
}

export class Instruction extends HTMLElement {
    constructor() {
        super();
        this.addEventListener('click', () => {
            const raw = this.textContent ?? '';
            const partial = raw.endsWith('...');
            const text = partial ? raw.slice(0, -3).trim() : raw;
            this.dispatchEvent(new CustomEvent<InstructionDetail>(InstructionEventName, {
                bubbles: true,
                detail: {text, partial},
            }));
        });
    }
}
