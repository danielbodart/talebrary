import {Uri} from "../http/Uri.ts";
import type {Dependency} from "@bodar/yadic/types.ts";
import type {Clock} from "../system/clock.ts";
import {CustomElementDefinition} from "./CustomElementDefinition.ts";

export const ImageTagName = 'x-image'

export interface ImageDependencies extends Dependency<'clock', Clock> {
    HTMLImageElement: typeof HTMLImageElement,
}

export class ImageElement {
    static definition({HTMLImageElement, clock}: ImageDependencies) {
        return new CustomElementDefinition(ImageTagName, class extends HTMLImageElement {
            constructor() {
                super();
                ['load', 'error'].forEach(event => this.addEventListener(event, () => this.updateState()));
                this.addEventListener('click', (e) => {
                    if ((this.ownerDocument.body.classList.contains('ctrl')||this.ownerDocument.body.classList.contains('meta'))
                        && this.getAttribute('reloadable') !== null) {
                        e.stopPropagation();
                        this.reload();
                    }
                });
            }

            connectedCallback() {
                this.updateState();
            }

            reload() {
                const url = new Uri(this.src);
                const params = new URLSearchParams(url.query);
                params.set('reload', String(clock.now().getTime()));
                url.query = params.toString();
                this.src = url.toString();
                this.updateState();
            }

            updateState() {
                if (this.complete) {
                    this.setAttribute('state', this.naturalWidth === 0 ? 'failed' : 'loaded');
                } else {
                    this.setAttribute('state', 'loading');
                }
            }

            static readonly observedAttributes: string[] = ["src"];

            attributeChangedCallback(_name: string, _oldValue: string, _newValue: string) {
                this.updateState();
            }

        }, {extends: 'img'});
    }
}
