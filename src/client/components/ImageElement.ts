import {Uri} from "../../http/Uri.ts";
import type {Dependency} from "../../yadic/mod.ts";
import type {Clock} from "../../system/clock.ts";
import {CustomElementDefinition} from "./CustomElementDefinition.ts";

export enum ImageState {
    Loading = 'loading',
    Loaded = 'loaded',
    Failed = 'failed'
}

export function calculateImageState(img: HTMLImageElement): ImageState {
    if (img.complete) return img.naturalWidth === 0 ? ImageState.Failed : ImageState.Loaded;
    return ImageState.Loading;
}

export const ImageTagName = 'x-image'

declare global {
    namespace JSX {
        interface HtmlImageTag {
            is?: typeof ImageTagName,
            state?: ImageState,
            reloadable?: boolean
        }
    }
}

export interface ImageDependencies extends Dependency<'clock', Clock> {
    HTMLImageElement: typeof HTMLImageElement,
}

export class ImageElement {
    static definition({HTMLImageElement, clock}: ImageDependencies) {
        return new CustomElementDefinition(ImageTagName, class extends HTMLImageElement {
            constructor() {
                super();
                ['load', 'error'].forEach(event => this.addEventListener(event, () => this.updateState()));
                this.addEventListener('click', () => {
                    if (this.getAttribute('reloadable') !== null) this.reload();
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
            }

            updateState() {
                this.setAttribute('state', calculateImageState(this));
            }
        }, {extends: 'img'});
    }
}




