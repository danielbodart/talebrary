import {D1GameFinder, type GameInfo} from "../cloudflare/D1GameFinder.ts";
import {roundStep, wellFormed} from "../templates/misc.ts";
import {Uri} from "../http/Uri.ts";
import {parseAcceptLanguage} from "../http/AcceptLanguage.ts";

import type {Dependency} from "@bodar/yadic/types.ts";
import {html5} from "../templates/LinkedomHelpers.ts";

export class ContentSearch {
    constructor(deps: Dependency<'finder', D1GameFinder>, private finder = deps.finder) {
    }

    async handle(request: Request): Promise<Response> {
        const uri = new Uri(request.url);
        const search = new URLSearchParams(uri.query).get('search') ?? '';
        const languages = parseAcceptLanguage(request.headers.get('accept-language'));
        const games = await this.finder.find(search, languages);
        return new Response(render(search, games), {status: 200, headers: {'Content-Type': 'text/html'}});
    }
}

export function render(search: string, games: GameInfo[]): string {
    return html5(jsx =>
        <html lang="en">
        <head>
            <meta name="template" content="card"/>
            <link rel="stylesheet" href="/catalogue.css"/>
            <script src="/catalogue/main.js" type="module"></script>
            <title>Search results</title>
        </head>
        <body>
        <main class="search catalogue">
            <div class="window grid">
                <div class="card">
                    <script type="application/ld+json" class="breadcrumb">{JSON.stringify({
                        '@type': 'BreadcrumbList',
                        itemListElement: [
                            {'@type': 'ListItem', position: 1, name: 'Atrium', item: '/catalogue'},
                            {'@type': 'ListItem', position: 2, name: 'Content'}
                        ]
                    })}</script>
                </div>
            </div>
            <div class="window buffer">
                {games.map((game) =>
                    <div class="card">
                        <div class="rating" aria-label="Rating" role="img">{roundStep(game.rating, 0.5)}</div>
                        <a href={game.playable ? `/content/${game.id}/` : undefined}>
                            <img is="x-image" reloadable class="image" src={`/content/${game.id}/cover-art`} loading="lazy" alt=""
                                 aria-hidden="true"></img>
                        </a>
                        <div class="title">{wellFormed(game.title)}</div>
                        <div class="author">{wellFormed(game.author)}</div>
                        {game.description ? <div class="description">{wellFormed(game.description)}</div> : ''}
                        {
                            // TODO Submit bug fix for typed-html to handle undefined attributes (should ignore)
                            game.playable ?
                                <a class="play" href={`/content/${game.id}/`}>Play</a> :
                                <a class="play">Play</a>
                        }

                    </div>
                )}
            </div>
            <div class="card input-control">
                <form class="input" action="/content/">
                    <input name="search" type="search" maxlength={256} value={search} autofocus={true}/>
                </form>
            </div>
        </main>
        </body>
        </html>);
}
