import type {Dependency} from "../yadic/mod.ts";
import {CustomElementDefinition} from "../client/components/CustomElementDefinition.ts";
import {createImageUrl, extractDataFromCard, getParams} from "./shared.ts";
import type {Clock} from "../system/clock.ts";

export interface CardCreatorDependencies extends Dependency<'HTMLElement', typeof HTMLElement>,
    Dependency<'CustomEvent', typeof CustomEvent>,
    Dependency<'clock', Clock>,
    Dependency<'history', History> {
}

export class PlayingCard {
    static definition({HTMLElement, history, clock}: CardCreatorDependencies) {
        return new CustomElementDefinition('playing-card', class extends HTMLElement {
            constructor() {
                super();
                this.querySelector('.delete')!.addEventListener('click', () => {
                    this.remove();
                    this.updateUrl();
                });
                this.querySelector('.regenerate')!.addEventListener('click', () => {
                    this.classList.add('regenerate', 'changed');
                    if(this.ownerDocument.activeElement instanceof HTMLElement) {
                        this.ownerDocument.activeElement.blur();
                    }
                });
                this.addEventListener('focus', () => this.focus());
                this.addEventListener('change', () => this.classList.add('changed'));
                this.addEventListener('focusout', () => {
                    if (this.classList.contains('changed')) {
                        this.updateImage();
                        this.updateUrl();
                        this.classList.remove('changed');
                    }
                });
                this.ownerDocument.defaultView!.addEventListener('beforeprint', () => {
                    const quantity = Number(this.querySelector('.quantity')!.textContent);
                    for (let i = 1; i < quantity; i++) {
                        const clone = this.cloneNode(true) as HTMLElement;
                        clone.classList.add('duplicate');
                        this.after(clone);
                    }
                });
                this.ownerDocument.defaultView!.addEventListener('afterprint', () => this.ownerDocument.querySelectorAll('.duplicate').forEach(e => e.remove()));
            }

            focus() {
                this.querySelector('textarea')!.focus();
            }

            connectedCallback() {
                this.focus()
            }

            private updateUrl() {
                this.setParams(getParams(this.ownerDocument));
            }

            private updateImage() {
                const image = this.querySelector<HTMLImageElement>('.image')!;
                const data = extractDataFromCard(this);
                image.src = createImageUrl(data, this.classList.contains('regenerate') ? String(clock.now().getTime()) : undefined);
                image.alt = data.description;
                this.classList.remove('regenerate');
            }

            private setParams(params: URLSearchParams) {
                history.pushState({}, '', `?${params.toString()}`);
            }
        });
    }
}