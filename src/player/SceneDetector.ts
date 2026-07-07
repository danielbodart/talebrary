import type {Describable, SceneContext} from "../types.ts";
import type {SuggestionTree} from "../prompts/SuggestionsTreePrompt.ts";
import {treeToNodes} from "./SuggestionNodes.ts";
import {buildSuggestionList} from "./SuggestionList.ts";

export class SceneDetector {
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

        const image = `/content/${id}/art?prompt=${encodeURIComponent(JSON.stringify(data))}`;
        const img = document.createElement('img', {is: 'x-image'});
        img.setAttribute('is', 'x-image');
        img.setAttribute('reloadable', '');
        img.className = 'image';
        img.loading = 'lazy';
        img.src = image;
        img.alt = '';
        img.setAttribute('aria-hidden', 'true');
        card.insertBefore(img, card.firstChild);

        card.classList.add('scene');

        fetch(`/content/${id}/suggestions?prompt=${encodeURIComponent(JSON.stringify(current))}`)
            .then(response => {
                if (!response.ok) return;
                response.json().then((json: SuggestionTree) => {
                    card.appendChild(buildSuggestionList(treeToNodes(json.tree)));
                });
            });
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
