import {constructor, instance, LazyMap} from "../yadic/mod.ts";
import {SystemClock} from "../system/clock.ts";
import {ImageElement} from "../components/ImageElement.ts";

import {CardCreator} from "./CardCreator.ts";
import {PlayingCard} from "./PlayingCard.ts";
import {customElement, realise} from "../components/misc.ts";

(async () => {
    const app = LazyMap.create()
        .set('window', instance(window))
        .set('storage', instance(window.localStorage))
        .set('document', instance(document))
        .set('clock', constructor(SystemClock))
        .set('http', instance(fetch))
        .set('logger', instance(console))
        .set('customElements', instance(window.customElements))
        .set('crypto', instance(window.crypto))
        .set('CustomEvent', instance(CustomEvent))
        .set('history', instance(history))
        .set('HTMLElement', instance(HTMLElement))
        .set('HTMLImageElement', instance(HTMLImageElement))
        .set('HTMLDivElement', instance(HTMLDivElement))
        .set('ImageElement', customElement(ImageElement))
        .set('CardCreator', customElement(CardCreator))
        .set('PlayingCard', customElement(PlayingCard))
    realise(app.ImageElement, app.CardCreator, app.PlayingCard);
})();
