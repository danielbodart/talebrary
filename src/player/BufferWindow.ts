import type {ProcessedContentSpan} from "@bodar/wasiglk";
import {SceneDetector} from "./SceneDetector.ts";
import {capitalWords, wordCount} from "../system/Strings.ts";

export class BufferWindow extends HTMLElement {
    private sceneDetector = new SceneDetector();
    private lastRawText = '';

    updateContent(content: ProcessedContentSpan[], clear: boolean) {
        // Remove intro card when game content arrives
        document.querySelector('main.story')?.remove();

        if (clear) {
            this.replaceChildren();
            this.lastRawText = '';
        }

        // Check if previous content ended at a paragraph boundary (newline or empty)
        const prevText = this.lastRawText.replace(/>\s*$/, '');
        const prevEndedParagraph = prevText === '' || prevText.endsWith('\n');

        // Track raw text for next call
        const lastTextSpan = [...content].reverse().find(s => s.type === 'text');
        if (lastTextSpan?.text) this.lastRawText = lastTextSpan.text;

        // Split multi-line text spans into one span per line
        const split = content.flatMap(s =>
            s.type === 'text' && s.text?.includes('\n')
                ? s.text.split('\n').map(line => ({...s, text: line}))
                : [s]
        );

        const lines = split.filter(s => s.type === 'text' && s.text?.trim() && s.text.trim() !== '>');
        if (lines.length === 0) return;

        const cards = this.groupIntoCards(lines);

        // Merge first new card with last existing card if appropriate
        const lastSection = this.querySelector<HTMLElement>('section.card:last-of-type');
        if (lastSection && cards.length > 0) {
            const firstNewCard = cards[0];
            const firstIsHeader = firstNewCard[0]?.style === 'header' || firstNewCard[0]?.style === 'subheader';
            const lastHasNormal = lastSection.querySelector('.normal') !== null;

            // Only start a new card for a header when previous content ended at a paragraph boundary.
            // Inline subheaders (e.g. "land" in "You going to land any time soon?") arrive as separate
            // spans but should merge into the current card, not start a new one.
            if (!firstIsHeader || !lastHasNormal || !prevEndedParagraph) {
                for (const span of firstNewCard) {
                    this.appendSpan(lastSection, span);
                }
                lastSection.classList.add('scroll');
                cards.shift();
            }
        }

        for (const card of cards) {
            const section = document.createElement('section');
            section.classList.add('card', 'scroll');
            for (const span of card) {
                this.appendSpan(section, span);
            }
            this.appendChild(section);
        }

        this.scrollToLatest();
    }

    private appendSpan(section: HTMLElement, span: ProcessedContentSpan) {
        const div = document.createElement('div');
        div.className = span.style ?? 'normal';
        if (span.style === 'normal' || !span.style) {
            div.append(...this.createInstructions(span.text ?? ''));
        } else {
            div.textContent = span.text ?? '';
        }
        section.appendChild(div);
    }

    private groupIntoCards(lines: ProcessedContentSpan[]): ProcessedContentSpan[][] {
        const cards: ProcessedContentSpan[][] = [];
        let current: ProcessedContentSpan[] = [];

        for (const line of lines) {
            const isHeader = line.style === 'header' || line.style === 'subheader';
            if (isHeader && current.length > 0) {
                const prevHasNormal = current.some(l => l.style === 'normal' || l.style === 'input' || !l.style);
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

    detectScene() {
        const lastCard = this.querySelector<HTMLElement>('section.card:last-of-type');
        if (!lastCard) return;
        this.sceneDetector.detect(lastCard);
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
