import {type InstructionDetail, Instruction, InstructionEventName} from "../player/Instruction.ts";

customElements.define('x-instruction', Instruction);

document.addEventListener(InstructionEventName, (ev: Event) => {
    const {text, partial} = (ev as CustomEvent<InstructionDetail>).detail;
    if (!partial) return;
    const input = document.querySelector<HTMLInputElement>('.input-control input');
    if (!input) return;
    input.value = `${text} `;
    input.focus({preventScroll: true});
});
