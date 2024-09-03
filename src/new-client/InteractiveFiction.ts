import type {Dependency} from "../yadic/mod.ts";
import {CustomElementDefinition} from "../client/components/CustomElementDefinition.ts";
import {type Http, post} from "../http/mod.ts";
import {MiniDialog} from "../client/MiniDialog.ts";
import {MiniGlkOte} from "../client/MiniGlkOte.ts";
import {InteractiveFictionHandler} from "./InteractiveFictionHandler.ts";
import type {InitMessage, Metrics} from "../client/types.ts";
import type {SupportedGameType} from "../types.ts";


export interface InteractiveFictionDependencies extends Dependency<'HTMLElement', typeof HTMLElement>,
    Dependency<'Dialog', MiniDialog>,
    Dependency<'GlkOte', MiniGlkOte>,
    Dependency<'metrics', Partial<Metrics>>,
    Dependency<'http', Http>,
    Dependency<'ifHandler', InteractiveFictionHandler>
{
}

export class InteractiveFiction {
    static definition({HTMLElement, metrics, ifHandler}: InteractiveFictionDependencies) {
        return new CustomElementDefinition('interactive-fiction', class extends HTMLElement {
            constructor() {
                super();
                console.log('InteractiveFiction constructor');
            }

            async connectedCallback() {
                console.log('InteractiveFiction connectedCallback');
                const src = this.getAttribute('src')!;
                const type = this.getAttribute('type') as SupportedGameType;
                const response = await ifHandler.handle(post(src, [['accept', type]], JSON.stringify(this.initMessage())));
                const update = await response.json();
                console.log('InteractiveFiction update', update);
            }

            initMessage(): InitMessage {
                return {
                    type: "init",
                    gen: 0,
                    metrics,
                    supports: ["garglktext", "graphics", "graphicswin", "hyperlinks", "timer"]
                };
            }

        });
    }
}


