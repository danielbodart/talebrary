import type {ProcessedContentSpan} from "@bodar/wasiglk";

export class GridWindow extends HTMLElement {
    private lineElements: HTMLDivElement[] = [];

    setGridSize(height: number) {
        const section = this.querySelector('section') ?? (() => {
            const s = document.createElement('section');
            s.classList.add('card');
            this.appendChild(s);
            return s;
        })();

        this.lineElements = [];
        section.replaceChildren();
        for (let i = 0; i < height; i++) {
            const line = document.createElement('div');
            line.className = 'line';
            line.id = `grid-line-${i}`;
            section.appendChild(line);
            this.lineElements.push(line);
        }
    }

    updateGridContent(content: ProcessedContentSpan[]) {
        // Grid content arrives as flat spans - render into first line
        const elements: HTMLElement[] = [];

        for (const span of content) {
            if (span.type === 'text') {
                const el = document.createElement('span');
                el.className = span.style ?? '';
                el.textContent = span.text ?? '';
                elements.push(el);
            }
        }

        if (elements.length > 0 && this.lineElements[0]) {
            this.lineElements[0].replaceChildren(...elements);
        }
    }
}
