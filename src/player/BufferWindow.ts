import type {ProcessedContentSpan} from "@bodar/wasiglk";
import {SceneDetector} from "./SceneDetector.ts";
import {capitalWords, wordCount} from "../system/Strings.ts";

export class BufferWindow extends HTMLElement {
    private sceneDetector = new SceneDetector();

    updateContent(content: ProcessedContentSpan[], clear: boolean) {
        // Remove intro card when game content arrives
        document.querySelector('main.story')?.remove();

        if (clear) this.replaceChildren();

        // Group spans into lines (split on newlines), then lines into cards
        const lines = this.groupIntoLines(content);
        if (lines.length === 0) return;

        const cards = this.groupIntoCards(lines);

        // Merge first new card with last existing card if appropriate
        const lastSection = this.querySelector<HTMLElement>('section.card:last-of-type');
        if (lastSection && cards.length > 0) {
            const firstNewCard = cards[0];
            const firstIsHeader = firstNewCard[0]?.[0]?.style === 'header' || firstNewCard[0]?.[0]?.style === 'subheader';
            const lastHasNormal = lastSection.querySelector('.normal') !== null;

            if (!firstIsHeader || !lastHasNormal) {
                for (const line of firstNewCard) {
                    this.appendLine(lastSection, line);
                }
                lastSection.classList.add('scroll');
                cards.shift();
            }
        }

        for (const card of cards) {
            const section = document.createElement('section');
            section.classList.add('card', 'scroll');
            for (const line of card) {
                this.appendLine(section, line);
            }
            this.appendChild(section);
        }

        this.scrollToLatest();
    }

    private appendLine(section: HTMLElement, line: ProcessedContentSpan[]) {
        if (line.length === 1) {
            const span = line[0];
            const div = document.createElement('div');
            div.className = span.style ?? 'normal';
            if (span.style === 'normal' || !span.style) {
                div.append(...this.createInstructions(span.text ?? ''));
            } else {
                div.textContent = span.text ?? '';
            }
            section.appendChild(div);
        } else {
            // Multiple spans on one line — wrap in div with inline spans (like old UpdateRenderer)
            const div = document.createElement('div');
            div.className = 'normal';
            for (const span of line) {
                const el = document.createElement('span');
                el.className = span.style ?? 'normal';
                if (span.style === 'normal' || !span.style) {
                    el.append(...this.createInstructions(span.text ?? ''));
                } else {
                    el.textContent = span.text ?? '';
                }
                div.appendChild(el);
            }
            section.appendChild(div);
        }
    }

    /** Split content on newlines into lines, where each line is an array of inline spans. */
    private groupIntoLines(content: ProcessedContentSpan[]): ProcessedContentSpan[][] {
        const lines: ProcessedContentSpan[][] = [];
        let current: ProcessedContentSpan[] = [];

        for (const span of content) {
            if (span.type !== 'text') continue;
            const text = span.text ?? '';
            if (!text.includes('\n')) {
                if (text.trim() && text.trim() !== '>') current.push(span);
                continue;
            }
            const parts = text.split('\n');
            for (let i = 0; i < parts.length; i++) {
                if (i > 0 && current.length > 0) {
                    lines.push(current);
                    current = [];
                }
                const part = parts[i];
                if (part.trim() && part.trim() !== '>') {
                    current.push({...span, text: part});
                }
            }
        }
        if (current.length > 0) lines.push(current);

        return lines;
    }

    /** Group lines into cards, splitting when a header follows normal content. */
    private groupIntoCards(lines: ProcessedContentSpan[][]): ProcessedContentSpan[][][] {
        const cards: ProcessedContentSpan[][][] = [];
        let current: ProcessedContentSpan[][] = [];

        for (const line of lines) {
            const isHeader = line[0]?.style === 'header' || line[0]?.style === 'subheader';
            if (isHeader && current.length > 0) {
                const prevHasNormal = current.some(l =>
                    l.some(s => s.style === 'normal' || s.style === 'input' || !s.style)
                );
                if (prevHasNormal) {
                    cards.push(current);
                    current = [];
                }
            }
            current.push(line);
        }
        if (current.length > 0) cards.push(current);

        return cards;
    }

    private createInstructions(text: string): (HTMLElement | string)[] {
        const result: (HTMLElement | string)[] = [];
        let position = 0;
        let match: RegExpExecArray | null;

        capitalWords.lastIndex = 0;
        while ((match = capitalWords.exec(text)) != null) {
            if (match.index > position) {
                result.push(text.substring(position, match.index));
            }
            const word = match[0];
            if (word.length >= 3 && wordCount(word) <= 4) {
                const el = document.createElement('x-instruction');
                el.textContent = word;
                result.push(el);
            } else {
                result.push(word);
            }
            position = capitalWords.lastIndex;
        }
        if (position < text.length) {
            result.push(text.substring(position));
        }
        return result;
    }

    detectScene(gridTitle?: string) {
        const lastCard = this.querySelector<HTMLElement>('section.card:last-of-type');
        if (!lastCard) return;
        this.sceneDetector.detect(lastCard, gridTitle);
    }

    private scrollToLatest() {
        const scrollElements = Array.from(this.querySelectorAll<HTMLElement>('section.card.scroll'));
        const scroll = scrollElements[0];
        if (scroll) {
            setTimeout(() => {
                scroll.scrollIntoView({block: 'start', behavior: 'smooth'});
                scrollElements.forEach(e => e.classList.remove('scroll'));
            }, 100);
        }
    }
}
