import {type InstructionEvent, InstructionEventName} from "./InstructionEvent.tsx";
import {CustomElementDefinition} from "./CustomElementDefinition.ts";

export const InstructionTagName = 'x-instruction'

declare global {
    namespace JSX {
        interface IntrinsicElements {
            [InstructionTagName]: {};
        }
    }
}

export interface InstructionDependencies {
    HTMLElement: typeof HTMLElement,
    CustomEvent: typeof CustomEvent
}

export class Instruction {
    static definition({HTMLElement, CustomEvent}: InstructionDependencies) {
        return new CustomElementDefinition(InstructionTagName, class extends HTMLElement {
            constructor() {
                super();
                this.addEventListener('click', _ =>
                    this.dispatchEvent(new CustomEvent<InstructionEvent>(InstructionEventName, {
                        bubbles: true,
                        detail: {text: this.textContent ?? ''}
                    })))
            }
        });
    }
}




