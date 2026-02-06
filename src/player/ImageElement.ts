import {Uri} from "../http/Uri.ts";

export class ImageElement extends HTMLImageElement {
    constructor() {
        super();
        this.addEventListener('load', () => this.updateState());
        this.addEventListener('error', () => this.updateState());
        this.addEventListener('click', (e) => {
            if ((document.body.classList.contains('ctrl') || document.body.classList.contains('meta'))
                && this.hasAttribute('reloadable')) {
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
        params.set('reload', String(Date.now()));
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

    static readonly observedAttributes = ['src'];

    attributeChangedCallback() {
        this.updateState();
    }
}
