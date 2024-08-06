import {constructor, instance, LazyMap} from "../yadic/mod.ts";
import {SystemClock} from "../system/clock.ts";
import {customElement, realise} from "../client/misc.tsx";
import {ImageElement} from "../client/components/ImageElement.ts";
import {InteractiveFiction} from "./InteractiveFiction.ts";
import {GridWindow} from "./GridWindow.ts";
import {SystemTimers} from "../system/timers.ts";
import {MiniDialog} from "../client/MiniDialog.ts";
import {MiniGlkOte} from "../client/MiniGlkOte.ts";
import {WindowMessageHandler} from "../client/client.ts";

(async () => {
    const app = LazyMap.create()
        .set('window', instance(window))
        .set('document', instance(document))
        .set('storage', instance(localStorage))
        .set('clock', constructor(SystemClock))
        .set('timers', constructor(SystemTimers))
        .set('http', instance(fetch))
        .set('logger', instance(console))
        .set('customElements', instance(customElements))
        .set('crypto', instance(crypto))
        .set('CustomEvent', instance(CustomEvent))
        .set('history', instance(history))
        .set('messageHandler', constructor(WindowMessageHandler))
        .set('Dialog', constructor(MiniDialog))
        .set('GlkOte', constructor(MiniGlkOte))
        .set('HTMLElement', instance(HTMLElement))
        .set('HTMLImageElement', instance(HTMLImageElement))
        .set('HTMLDivElement', instance(HTMLDivElement))
        .set('ImageElement', customElement(ImageElement))
        .set('InteractiveFiction', customElement(InteractiveFiction))
        .set('GridWindow', customElement(GridWindow))
    realise(app.ImageElement, app.InteractiveFiction, app.GridWindow);
})();