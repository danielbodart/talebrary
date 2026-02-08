import type {TextSpan} from "@bodar/wasiglk";
import {SceneDetector} from "./SceneDetector.ts";
import {capitalWords, wordCount} from "../system/Strings.ts";
import {CustomElementDefinition} from "../components/CustomElementDefinition.ts";

interface BufferWindowDeps {
    HTMLElement: typeof HTMLElement;
}

export class BufferWindow {
    static definition({HTMLElement}: BufferWindowDeps) {
        return new CustomElementDefinition('buffer-window', class extends HTMLElement {
            private sceneDetector = new SceneDetector();
            gridTitle = '';

            updateContent(content: TextSpan[], clear: boolean) {
                document.querySelector('main.story')?.remove();

                if (clear) this.replaceChildren();

                const lines = this.groupIntoLines(content);
                if (lines.length === 0) return;

                this.promoteGridTitleLines(lines);
                const cards = this.groupIntoCards(lines);

                const newSections = cards.map(card => {
                    const section = document.createElement('section');
                    section.classList.add('card', 'scroll');
                    for (const line of card) this.appendLine(section, line);
                    return section;
                });

                const lastSection = this.querySelector<HTMLElement>('section.card:last-of-type');
                if (lastSection && newSections.length > 0 && this.shouldMerge(lastSection, newSections[0])) {
                    const first = newSections.shift()!;
                    while (first.firstChild) lastSection.appendChild(first.firstChild);
                    lastSection.classList.add('scroll');
                }

                for (const section of newSections) this.appendChild(section);

                this.scrollToLatest();
            }

            private appendLine(section: HTMLElement, line: TextSpan[]) {
                if (line.length === 1) {
                    const span = line[0];
                    const div = document.createElement('div');
                    div.className = span.style ?? 'normal';
                    if (span.style === 'normal' || !span.style) {
                        div.append(...this.createInstructions(span.text));
                    } else {
                        div.textContent = span.text;
                    }
                    section.appendChild(div);
                } else {
                    const div = document.createElement('div');
                    div.className = 'normal';
                    for (const span of line) {
                        const el = document.createElement('span');
                        el.className = span.style ?? 'normal';
                        if (span.style === 'normal' || !span.style) {
                            el.append(...this.createInstructions(span.text));
                        } else {
                            el.textContent = span.text;
                        }
                        div.appendChild(el);
                    }
                    section.appendChild(div);
                }
            }

            private groupIntoLines(content: TextSpan[]): TextSpan[][] {
                const lines: TextSpan[][] = [];
                let current: TextSpan[] = [];

                for (const span of content) {
                    const text = span.text;
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

            private groupIntoCards(lines: TextSpan[][]): TextSpan[][][] {
                const cards: TextSpan[][][] = [];
                let current: TextSpan[][] = [];

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

            private shouldMerge(lastSection: HTMLElement, newSection: HTMLElement): boolean {
                if (newSection.querySelector('.header, .subheader')) {
                    return !lastSection.querySelector('.normal, .input');
                }
                return true;
            }

            private promoteGridTitleLines(lines: TextSpan[][]) {
                if (!this.gridTitle) return;
                for (const line of lines) {
                    if (line.length === 1 && line[0].text.trim() === this.gridTitle) {
                        line[0] = {...line[0], style: 'subheader'};
                    }
                }
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

            echoInput(text: string) {
                const section = document.createElement('section');
                section.classList.add('card');
                const div = document.createElement('div');
                div.className = 'input';
                div.textContent = text;
                section.appendChild(div);
                this.appendChild(section);
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
        });
    }
}
