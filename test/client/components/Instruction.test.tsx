import {describe, expect, test} from "bun:test";
import {parseHTML} from "linkedom";
import {Instruction} from "../../../src/client/comonents/Instruction.tsx";
import * as elements from "typed-html";
import {type InstructionEvent, InstructionEventName} from "../../../src/client/comonents/InstructionEvent.tsx";


describe("Instruction", () => {
    test("when clicked fires an instruction event that bubbles up", async () => {
        const window = parseHTML(<body><x-instruction>test</x-instruction></body>);
        Instruction.register(window);

        const element = window.document.querySelector<HTMLElement>('x-instruction')!;
        const event = new Promise<InstructionEvent>(resolve => {
            // @ts-ignore
            element.parentElement.addEventListener(InstructionEventName, (e: CustomEvent<InstructionEvent>) => resolve(e.detail));
        });

        element.click();

        expect((await event).text).toEqual('test')
    });
})
