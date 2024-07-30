import type {Clock} from "../system/clock.ts";
import {Objects} from "../system/Objects.ts";
import {Uri} from "../http/Uri.ts";
import type {Dependency} from "../yadic/mod.ts";

export interface EventBuilderDependencies extends
    Dependency<'window', Window>,
    Dependency<'clock', Clock>
{}

export class EventBuilder {
    constructor(private deps: EventBuilderDependencies) {
    }

    build(properties: object): object {
        return Objects.removeEmpty({
            createdAt: this.deps.clock.now(),
            messageId: crypto.randomUUID(),
            context: {
                app: {name: 'talebrary', version: '1.0.0'},
                userAgent: this.deps.window.navigator.userAgent,
                locale: this.deps.window.navigator.language,
                page: {
                    title: this.deps.window.document.title,
                    locale: this.deps.window.document.documentElement.lang || this.deps.window.document.documentElement.getAttribute('xml:lang') || '',
                    url: this.deps.window.location.href,
                    urlParsed: {...new Uri(this.deps.window.location.href)},
                    referrer: this.deps.window.document.referrer,
                    referrerParsed: {...new Uri(this.deps.window.document.referrer)},
                    characterSet: this.deps.window.document.characterSet,
                },
                screen: {
                    width: this.deps.window.screen.width,
                    height: this.deps.window.screen.height,
                },
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            properties
        });
    }
}

