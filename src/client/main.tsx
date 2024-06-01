import {client, WindowMessageHandler} from "./client.ts";
import type {SupportedGameType} from "../types.ts";
import {UpdateRenderer} from "./UpdateRenderer.tsx";
import {calculateMaxSize} from "./Measure.ts";

(async () => {
    const story = document.querySelector<HTMLLinkElement>('#story');
    if (!story) throw new Error("Could not find story");
    const type = story.dataset.type;
    if (!type) throw new Error("Could not find story type attribute");
    const messageHandler = new WindowMessageHandler(window);
    await client(story.href, type as SupportedGameType, window.localStorage, messageHandler);
    new UpdateRenderer(document, messageHandler, calculateMaxSize(window));
})();



