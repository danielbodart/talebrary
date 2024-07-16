import type {Dependency} from "../yadic/mod.ts";
import {CustomElementDefinition} from "../client/components/CustomElementDefinition.ts";
import {createImageUrl, extractDataFromCard, getParams} from "./shared.ts";

export interface CardCreatorDependencies extends Dependency<'HTMLElement', typeof HTMLElement>,
    Dependency<'CustomEvent', typeof CustomEvent>,
    Dependency<'history', History> {
}

export class PlayingCard {
    static definition({HTMLElement, history}: CardCreatorDependencies) {
        return new CustomElementDefinition('playing-card', class extends HTMLElement {
            constructor() {
                super();
                this.querySelector('.delete')!.addEventListener('click', () => {
                    this.remove();
                    this.updateUrl();
                });
                this.addEventListener('focus', () => this.querySelector('textarea')!.focus());
                this.addEventListener('change', () => this.classList.add('changed'));
                this.addEventListener('focusout', () => {
                    if (this.classList.contains('changed')) {
                        this.updateImage();
                        this.updateUrl();
                        this.classList.remove('changed');
                    }
                });
            }

            connectedCallback() {
                this.querySelector('textarea')!.focus()
            }

            private updateUrl() {
                this.setParams(getParams(this.ownerDocument));
            }

            // @ts-ignore
            private updateImage() {
                const image = this.querySelector<HTMLImageElement>('.image')!;
                const data = extractDataFromCard(this);
                image.src = createImageUrl(data);
                image.alt = data.description;
            }

            private setParams(params: URLSearchParams) {
                history.pushState({}, '', `?${params.toString()}`);
            }
        });
    }
}