import {client, WindowMessageHandler} from "./client.ts";
import type {SupportedGameType} from "../types.ts";
import type {BufferContent, UpdateMessage} from "./types.ts";
import * as elements from "typed-html";
import {Fragment, fragment} from "../templates/Fragment.tsx";

(async () => {
    const story = document.querySelector<HTMLLinkElement>('#story');
    if (!story) throw new Error("Could not find story");
    const type = story.dataset.type;
    if (!type) throw new Error("Could not find story type attribute");
    await client(story.href, type as SupportedGameType, window.localStorage, new WindowMessageHandler(window));
    // TODO Work out sizes and other features
    window.postMessage({"type": "init", "gen": 0, "metrics": {"width": 80, "height": 24}});
    window.addEventListener('message', message => {
        if (message.data.type !== 'update') return;
        const update = message.data as UpdateMessage;
        const html = render(update);
        document.body.append(fragment(html))
    })
})();

const breakOn = new Set(['header', 'subheader']);

export function render(update: UpdateMessage): string {
    const bufferId = update.windows.find(w => w.type === 'buffer')?.id;
    const bufferContent = update.content.filter(c => c.id === bufferId) as BufferContent[];
    const input = update.input.find(c => c.id === bufferId);
    return <Fragment>
        <div class="card">
            {bufferContent.flatMap(b => {
                return b.text.flatMap(t => {
                    if (!t.content) {
                        return <div class="softbreak"></div>;
                    } else if (t.content.length === 1) {
                        return t.content.map(c => {
                            return (breakOn.has(c.style) ? '</div><div class="card">' : '') +
                                (c.text === '>' ? '' : <div class={c.style}>{c.text}</div>)
                        });
                    } else {
                        return <div class="paragraph">{t.content.map(c => <span class={c.style}>{c.text}</span>)}</div>
                    }
                });
            }).join('')}
        </div>
        {input ?
            <div class="card">
                <div class="input">
                    <input type="text" maxlength={String(input.maxlen ?? 256)} autofocus="autofocus"/>
                </div>
            </div>
            : ''}
    </Fragment>
}

