export const InstructionEventName = `instruction`;

export interface InstructionEvent {
    text: string;
}

declare global {
    interface Document {
        addEventListener(type: typeof InstructionEventName, listener: (ev: CustomEvent<InstructionEvent>) => void, options?: boolean | AddEventListenerOptions): void;
    }
}