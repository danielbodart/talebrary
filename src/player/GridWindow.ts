import type {TextSpan} from "@bodar/wasiglk";
import {CustomElementDefinition} from "../components/CustomElementDefinition.ts";

interface GridWindowDeps {
    HTMLElement: typeof HTMLElement;
}

export class GridWindow {
    static definition({HTMLElement}: GridWindowDeps) {
        return new CustomElementDefinition('grid-window', class extends HTMLElement {
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

            get roomTitle(): string {
                const firstLine = this.lineElements[0];
                if (!firstLine) return '';
                const text = firstLine.textContent ?? '';
                const parts = text.split(/\s{2,}/);
                return parts[0]?.trim() ?? '';
            }

            updateGridContent(content: TextSpan[]) {
                const elements: HTMLElement[] = [];

                for (const span of content) {
                    const el = document.createElement('span');
                    el.className = span.style ?? '';
                    el.textContent = span.text;
                    elements.push(el);
                }

                if (elements.length > 0 && this.lineElements[0]) {
                    this.lineElements[0].replaceChildren(...elements);
                }
            }
        });
    }
}
