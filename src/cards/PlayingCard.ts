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
                this.addEventListener('focusout', () => {
                    const changed = this.hasFormChanged();
                    console.log('Form changed', changed);
                    if (changed) {
                        this.updateImage();
                        this.updateUrl();
                    }
                });
            }

            connectedCallback() {
                this.querySelector('textarea')!.focus()
            }

            hasFormChanged() {
                return hasFormChanged(this.querySelector('form')!);
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

function hasFormChanged(form: HTMLFormElement): boolean {
    for (const element of Array.from(form.elements)) {
        if (element instanceof HTMLInputElement) {
            if (element.type === 'checkbox' || element.type === 'radio') {
                if (element.checked !== element.defaultChecked) return true;
            } else {
                if (element.value !== element.defaultValue) return true;
            }
        } else if (element instanceof HTMLSelectElement) {
            for (const option of Array.from(element.options)) {
                if (option.selected !== option.defaultSelected) return true;
            }
        } else if (element instanceof HTMLTextAreaElement) {
            if (element.value !== element.defaultValue) return true;
        }
    }
    return false;
}