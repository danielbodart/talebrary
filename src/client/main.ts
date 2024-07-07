import {client, WindowMessageHandler} from "./client.ts";
import type {SupportedGameType} from "../types.ts";
import {UpdateRenderer} from "./UpdateRenderer.tsx";
import {calculateMaxSize} from "./Measure.ts";

(async () => {
    reloadableImages(document)
    removeBrokenImages(document)
    const story = document.querySelector<HTMLLinkElement>('#story');
    if (!story) throw new Error("Could not find story");
    const type = story.dataset.type;
    if (!type) throw new Error("Could not find story type attribute");
    const messageHandler = new WindowMessageHandler(window);
    await client(story.href, type as SupportedGameType, window.localStorage, messageHandler);
    new UpdateRenderer(document, messageHandler, calculateMaxSize(window));
})();


function removeBrokenImages(document:Document) {
    document.addEventListener('error', ev => {
        if (ev.target instanceof HTMLElement && ev.target.tagName === 'IMG') {
            ev.target.parentElement!.removeChild(ev.target);
        }
    }, true)
}

function reloadableImages(document:Document) {
    document.addEventListener('click', ev => {
        const element = ev.target;
        if (element instanceof HTMLImageElement && element.classList.contains('reloadable')) {
            const url = new URL(element.src);
            url.searchParams.set('reload', Date.now().toString());
            element.src = url.toString();
        }
    }, true)
}

