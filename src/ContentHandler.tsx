import {Uri} from "./http.ts";
import type {D1GameFinder, GameStory} from "./D1GameFinder.ts";
import * as elements from "typed-html";
import {wellFormed} from "./misc.ts";

export class ContentHandler {
    constructor(private gameFinder: D1GameFinder) {
    }

    async handle(request: Request): Promise<Response> {
        const {path} = new Uri(request.url);
        const [, , id] = path.split('/');
        const game = await this.gameFinder.get(id);

        if (!game) return new Response('Not Found', {status: 404});

        return new Response(render(game), {status: 200, headers: {'Content-Type': 'text/html'}});
    }
}

export function render(game: GameStory): string {
    return <html lang="en">
    <head>
        <title>{game.title}</title>
        <meta name="template" content="card"/>
        <link id="story" rel="preload" href={game.url} as="fetch"/>
    </head>
    <body>
    <div class="card">
        <img class="image" src={`/content/${game.id}/cover-art`} loading="lazy"></img>
        <div class="title">{wellFormed(game.title)}</div>
        <div class="author">Loading...</div>
    </div>

    <script src="/client.js"></script>
    </body>
    </html>
}
