import * as elements from "typed-html";

declare global {
    namespace JSX {
        interface IntrinsicElements {
            "instruction": {};
        }
    }
}

export function instruction(text: string) {
    return <instruction>{text}</instruction>
}

export const InstructionEventName = `instruction`;

export interface InstructionEvent {
    text: string;
}

export function instructionClass(dep: { HTMLElement: typeof HTMLElement, CustomEvent: typeof CustomEvent }) {
    return class extends dep.HTMLElement {
        connectedCallback() {
            this.addEventListener('click', _ =>
                this.dispatchEvent(new dep.CustomEvent<InstructionEvent>(InstructionEventName, {
                    bubbles: true,
                    detail: {text: this.textContent ?? ''}
                })))
        }
    }
}


