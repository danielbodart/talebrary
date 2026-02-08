import {binPack} from "./BinPack.ts";

export class Suggestions extends HTMLElement {
    connectedCallback() {
        this.classList.add('suggestions');

        const layout = () => {
            binPack(this);
            Array.from(this.children).forEach(child => {
                const el = child as HTMLElement;
                el.classList.toggle('hidden', el.offsetTop + el.offsetHeight > this.clientHeight);
            });
        };

        requestAnimationFrame(layout);

        let timeout: ReturnType<typeof setTimeout>;
        window.addEventListener('resize', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => requestAnimationFrame(layout), 150);
        });
    }
}
