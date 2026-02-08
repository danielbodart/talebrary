import type {D1GameFinder, GameStory} from "../cloudflare/D1GameFinder.ts";
import {Uri} from "../http/Uri.ts";
import {compactText, wellFormed} from "../templates/misc.ts";
import type {Dependency} from "@bodar/yadic/types.ts";
import {html5} from "../templates/LinkedomHelpers.ts";

export class ContentHandler {
    constructor(deps: Dependency<'finder', D1GameFinder>, private finder: D1GameFinder = deps.finder) {
    }

    async handle(request: Request): Promise<Response> {
        const {path} = new Uri(request.url);
        const [, , id] = path.split('/');
        const game = await this.finder.get(id);

        if (!game) return new Response('Not Found', {status: 404});

        return new Response(render(game), {status: 200, headers: {'Content-Type': 'text/html'}});
    }
}

export function render(game: GameStory): string {
    return html5(jsx =>
        <html lang="en">
        <head>
            <title>{game.title}</title>
            <meta name="template" content="card"/>
            <meta name="description" content={compactText(game.description)}/>
            <link id="story" rel="preload" href={`/content/${game.id}/story`} as="fetch" data-type={game.type}
                  crossorigin="crossorigin"/>
        </head>
        <body>
        <div class="window grid">
            <div class="card">
                <script type="application/ld+json" class="breadcrumb">{JSON.stringify({
                    '@type': 'BreadcrumbList',
                    itemListElement: [
                        {'@type': 'ListItem', position: 1, name: 'Atrium', item: '/catalogue'},
                        {'@type': 'ListItem', position: 2, name: 'Search', item: '/content'},
                        {'@type': 'ListItem', position: 3, name: game.title}
                    ]
                })}</script>
            </div>
        </div>
        <main class="story">
            <div class="card">
                <img class="image" src={`/content/${game.id}/cover-art`} loading="lazy"></img>
                <div class="title">{wellFormed(game.title)}</div>
                <div class="author">{wellFormed(game.author)}</div>
            </div>
        </main>
        <script type="module" src="/player/main.js"></script>
        </body>
        </html>);
}
