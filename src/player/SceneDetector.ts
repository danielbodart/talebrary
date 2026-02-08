import type {Describable, SceneContext} from "../types.ts";
import type {SuggestionTree} from "../prompts/SuggestionsTreePrompt.ts";
import {treeToSuggestions} from "./PrefixTree.ts";

export class SceneDetector {
    private models = ['llama+stable-diffusion'];

    detect(card: HTMLElement) {
        const hasHeader = card.querySelector('.header, .subheader');
        const hasNormal = card.querySelector('.normal');
        const hasImage = card.querySelector('.image');
        const hasInput = card.querySelector('user-input');

        if (!hasHeader || !hasNormal || hasImage || hasInput) return;

        const path = window.location.pathname;
        const [, , id] = path.split('/');
        if (!id) return;

        const current = this.extractScene(card);
        const data: SceneContext = {
            story: {
                title: document.title,
                description: document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '',
            },
            scene: current,
        };

        for (const model of this.models) {
            const image = `/content/${id}/art?prompt=${encodeURIComponent(JSON.stringify(data))}&model=${encodeURIComponent(model)}`;
            const img = document.createElement('img', {is: 'x-image'});
            img.setAttribute('is', 'x-image');
            img.setAttribute('reloadable', '');
            img.className = 'image';
            img.loading = 'lazy';
            img.src = image;
            img.alt = '';
            img.setAttribute('aria-hidden', 'true');
            card.insertBefore(img, card.firstChild);
        }

        card.classList.add('scene');

        fetch(`/content/${id}/suggestions?prompt=${encodeURIComponent(JSON.stringify(current))}`)
            .then(response => {
                if (!response.ok) return;
                response.json().then((json: SuggestionTree) => {
                    const collapsed = treeToSuggestions(json.tree);
                    const suggestions = document.createElement('x-suggestions');
                    for (const {text, completions} of collapsed) {
                        const instruction = document.createElement('x-instruction');
                        instruction.textContent = text;
                        if (completions.length > 0) {
                            instruction.dataset.completions = JSON.stringify(completions);
                        }
                        suggestions.appendChild(instruction);
                    }
                    card.appendChild(suggestions);
                });
            });

        const event = {title: current.title, description: current.description};
        navigator.sendBeacon('/events', JSON.stringify(event));
    }

    private extractScene(card: HTMLElement): Describable {
        const titleEl = card.querySelector<HTMLElement>('.header, .subheader');
        const normalEls = Array.from(card.querySelectorAll<HTMLElement>(':scope > .normal'));
        return {
            title: titleEl?.innerText ?? '',
            description: normalEls.map(e => e.innerText).join(' '),
        };
    }
}
