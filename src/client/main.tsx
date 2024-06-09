import {client, WindowMessageHandler} from "./client.ts";
import type {SupportedGameType} from "../types.ts";
import {UpdateRenderer} from "./UpdateRenderer.tsx";
import {calculateMaxSize} from "./Measure.ts";

(async () => {
    removeBrokenImages(document)
    const story = document.querySelector<HTMLLinkElement>('#story');
    if (!story) throw new Error("Could not find story");
    const type = story.dataset.type;
    if (!type) throw new Error("Could not find story type attribute");
    const messageHandler = new WindowMessageHandler(window);
    await client(story.href, type as SupportedGameType, window.localStorage, messageHandler);
    new UpdateRenderer(document, messageHandler, calculateMaxSize(window));
    routeKeys(document)
})();


function removeBrokenImages(document:Document) {
    document.addEventListener('error', ev => {
        if (ev.target instanceof HTMLElement && ev.target.tagName === 'IMG') {
            ev.target.parentElement!.removeChild(ev.target);
        }
    }, true)
}

export function routeKeys(document:Document) {
    ['keydown' /*, 'keypress', 'keyup'*/].forEach(eventType => {
        document.addEventListener(eventType, function (event) {
            const input = document.querySelector<HTMLInputElement>('.input-control .input input');
            if (input && event.target !== input) {
                event.preventDefault();
                document.defaultView?.setTimeout(() => input.focus(), 0);
            }
        }, true);
    });
}

