import {client, WindowMessageHandler} from "./client.ts";
import type {SupportedGameType} from "../types.ts";
import {UpdateRenderer} from "./UpdateRenderer.tsx";
import {calculateMaxSize} from "./Measure.ts";
import {constructor, instance, LazyMap} from "../yadic/mod.ts";
import {SystemClock} from "../system/clock.ts";
import {Instruction} from "./components/Instruction.tsx";
import {ImageElement} from "./components/ImageElement.ts";
import type {CustomElementDefinition} from "./components/CustomElementDefinition.ts";

(async () => {
    const story = document.querySelector<HTMLLinkElement>('#story');
    if (!story) throw new Error("Could not find story");
    const type = story.dataset.type;
    if (!type) throw new Error("Could not find story type attribute");
    const app = LazyMap.create()
        .set('story', instance(story.href))
        .set('type', instance(type as SupportedGameType))
        .set('window', instance(window))
        .set('storage', instance(window.localStorage))
        .set('document', instance(document))
        .set('clock', constructor(SystemClock))
        .set('http', instance(fetch))
        .set('logger', instance(console))
        .set('messageHandler', constructor(WindowMessageHandler))
        .set('customElements', instance(window.customElements))
        .set('CustomEvent', instance(CustomEvent))
        .set('HTMLElement', instance(HTMLElement))
        .set('HTMLImageElement', instance(HTMLImageElement))
        .set('Instruction', customElement(Instruction))
        .set('ImageElement', customElement(ImageElement))
        .set('client', client)
        .set('metrics', calculateMaxSize)
        .set('renderer', constructor(UpdateRenderer));
    await app.client;
    realise(app.renderer, app.Instruction, app.ImageElement);

})();

export function customElement<D, C extends CustomElementConstructor>(value: {
    definition: (deps: D) => CustomElementDefinition<C>
}) {
    return (deps: D & { customElements: CustomElementRegistry }) => value.definition(deps).apply(deps.customElements);
}

export function realise(...args: any[]) {
    return args;
}
