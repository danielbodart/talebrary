import {describe, expect, test} from "bun:test";
import {parseHTML} from "linkedom";
import {
    instruction,
    instructionClass,
    type InstructionEvent,
    InstructionEventName
} from "../../../src/client/comonents/Instruction.tsx";


describe("Instruction", () => {
    test("when clicked fires an instruction event that bubbles up", async () => {
        const window = parseHTML(`<body>${instruction('test')}</body>`);
        window.customElements.define('instruction', instructionClass(window));

        const element = window.document.querySelector<HTMLElement>('instruction')!;
        const event = new Promise<InstructionEvent>(resolve => {
            // @ts-ignore
            element.parentElement.addEventListener(InstructionEventName, (e: CustomEvent<InstructionEvent>) => resolve(e.detail));
        });

        element.click();

        expect((await event).text).toEqual('test')
    });
})
