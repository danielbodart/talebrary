import {binPack} from "./BinPack.ts";

export class Suggestions extends HTMLElement {
    connectedCallback() {
        this.classList.add('suggestions');

        const observer = new IntersectionObserver(
            (entries) => entries.forEach(entry => {
                (entry.target as HTMLElement).classList.toggle('hidden', entry.intersectionRatio < 1);
            }),
            {root: this}
        );

        Array.from(this.children).forEach(child => observer.observe(child));

        new ResizeObserver(() => requestAnimationFrame(() => binPack(this))).observe(this);
    }
}
