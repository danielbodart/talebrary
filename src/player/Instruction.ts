export const InstructionEventName = 'instruction';

export class Instruction extends HTMLElement {
    constructor() {
        super();
        this.addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent(InstructionEventName, {
                bubbles: true,
                detail: {text: this.textContent ?? ''},
            }));
        });
    }
}
