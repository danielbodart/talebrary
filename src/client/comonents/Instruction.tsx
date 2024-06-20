import {type InstructionEvent, InstructionEventName} from "./InstructionEvent.tsx";

declare global {
    namespace JSX {
        interface IntrinsicElements {
            "instruction": {};
        }
    }
}

export interface InstructionDependencies {
    HTMLElement: typeof HTMLElement,
    CustomEvent: typeof CustomEvent
}

export class Instruction {
    static create({HTMLElement, CustomEvent}: InstructionDependencies) {
        return class extends HTMLElement {
            connectedCallback() {
                this.addEventListener('click', _ =>
                    this.dispatchEvent(new CustomEvent<InstructionEvent>(InstructionEventName, {
                        bubbles: true,
                        detail: {text: this.textContent ?? ''}
                    })))
            }
        }
    }

    static register(dep: { customElements: CustomElementRegistry } & InstructionDependencies) {
        dep.customElements.define(InstructionEventName, this.create(dep))
    }

}




