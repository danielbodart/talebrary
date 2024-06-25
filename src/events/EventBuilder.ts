import type {Clock} from "../clock.ts";
import {Objects} from "../Objects.ts";
import {Uri} from "../http/Uri.ts";

export class EventBuilder {
    constructor(private window: Window, private clock: Clock) {
    }

    build(properties: object): object {
        return Objects.removeEmpty({
            createdAt: this.clock.now(),
            messageId: crypto.randomUUID(),
            context: {
                app: {name: 'talebrary', version: '1.0.0'},
                userAgent: this.window.navigator.userAgent,
                locale: this.window.navigator.language,
                page: {
                    title: this.window.document.title,
                    locale: this.window.document.documentElement.lang || this.window.document.documentElement.getAttribute('xml:lang') || '',
                    url: this.window.location.href,
                    urlParsed: new Uri(this.window.location.href),
                    referrer: this.window.document.referrer,
                    referrerParsed: new Uri(this.window.document.referrer),
                    characterSet: this.window.document.characterSet,
                },
                screen: {
                    width: this.window.screen.width,
                    height: this.window.screen.height,
                },
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            properties
        });
    }
}

