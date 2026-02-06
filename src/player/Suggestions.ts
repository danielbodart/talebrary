import {binPack} from "./BinPack.ts";

export class Suggestions extends HTMLElement {
    connectedCallback() {
        this.classList.add('suggestions');

        const hideOverflow = () => Array.from(this.children).forEach(child => {
            const el = child as HTMLElement;
            el.classList.toggle('hidden', el.offsetTop + el.offsetHeight > this.clientHeight);
        });

        new ResizeObserver(() => requestAnimationFrame(() => {
            binPack(this);
            hideOverflow();
        })).observe(this);
    }
}
