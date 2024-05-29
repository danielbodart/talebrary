import {client, WindowMessageHandler} from "./client.ts";
import type {SupportedGameType} from "../types.ts";
import type {BufferContent, UpdateMessage} from "./types.ts";
import * as elements from "typed-html";
import {fragment} from "../templates/Fragment.tsx";

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

export function render(update: UpdateMessage): string {
    const bufferId = update.windows.find(w => w.type === 'buffer')?.id;
    const bufferContent = update.content.filter(c => c.id === bufferId) as BufferContent[];
    return <div class="card">
        <div class="author">
            {bufferContent.flatMap(b =>
                b.text.flatMap(t =>
                    t.content?.map(c =>
                        <p>{c.text}</p>))).join('')}
        </div>
    </div>
}

