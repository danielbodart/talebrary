import type {GameFinder, GameInfo} from "../games/GameFinder.ts";
import {roundStep, wellFormed} from "../templates/misc.ts";
import {html5} from "../templates/LinkedomHelpers.ts";
import {type AnyCategory, findCategory, findWing, isGenreCategory, isHandPickedCategory, type Wing} from "./CatalogueConfig.ts";
import {Uri} from "../http/Uri.ts";
import {parseAcceptLanguage} from "../http/AcceptLanguage.ts";
import type {Dependency} from "@bodar/yadic/types.ts";

export class AisleHandler {
    constructor(deps: Dependency<'finder', GameFinder>, private finder = deps.finder) {
    }

    async handle(request: Request): Promise<Response> {
        const {path} = new Uri(request.url);
        const [, , wingId, categoryId] = path.split('/');

        const wing = findWing(wingId);
        if (!wing) return new Response('Not Found', {status: 404});

        const category = findCategory(wing, categoryId);
        if (!category) return new Response('Not Found', {status: 404});

        const languages = parseAcceptLanguage(request.headers.get('accept-language'));
        const games = await this.findGames(category, languages);

        return new Response(render(wing, category, games), {status: 200, headers: {'Content-Type': 'text/html'}});
    }

    private async findGames(category: AnyCategory, languages: string[]): Promise<GameInfo[]> {
        if (isGenreCategory(category)) {
            return this.finder.findByGenre(category.genre, languages);
        }
        if (isHandPickedCategory(category)) {
            return this.finder.findByIds(category.games, languages);
        }
        switch (category.type) {
            case 'top-rated':
                return this.finder.findTopRated(languages);
            case 'recent':
                return this.finder.findRecent(languages);
        }
    }
}

function render(wing: Wing, category: AnyCategory, games: GameInfo[]): string {
    const illustrationUrl = `/cards/art?prompt=${encodeURIComponent(JSON.stringify({
        story: {title: 'The Talebrary Athenaeum', description: 'A vast library of interactive fiction games'},
        scene: category.illustration,
    }))}`;

    return html5(jsx =>
        <html lang="en">
        <head>
            <title>{category.title} - {wing.title} - Talebrary</title>
            <meta name="template" content="card"/>
            <link rel="stylesheet" href="/catalogue.css"/>
            <script src="/catalogue/main.js" type="module"></script>
        </head>
        <body>
        <main class="story catalogue">
            <div class="window grid">
                <div class="card">
                    <script type="application/ld+json" class="breadcrumb">{JSON.stringify({
                        '@type': 'BreadcrumbList',
                        itemListElement: [
                            {'@type': 'ListItem', position: 1, name: 'Atrium', item: '/catalogue'},
                            {'@type': 'ListItem', position: 2, name: wing.title, item: `/catalogue/${wing.id}`},
                            {'@type': 'ListItem', position: 3, name: category.title}
                        ]
                    })}</script>
                </div>
            </div>

            <div class="card scene-card">
                <img is="x-image" reloadable class="image" src={illustrationUrl} loading="eager" alt="" aria-hidden="true"></img>
                <div class="title">{category.title}</div>
                <div class="normal">{category.narrative}</div>
                <div class="suggestions nav">
                    <x-instruction>search...</x-instruction>
                    <a href={`/catalogue/${wing.id}`}>go back</a>
                    {wing.categories
                        .filter(c => c.id !== category.id)
                        .slice(0, 2)
                        .map(c => <a href={`/catalogue/${wing.id}/${c.id}`}>go {c.id}</a>
                        )}
                </div>
            </div>

            <div class="card input-control">
                <form class="input" action="/content/">
                    <input type="text" maxlength={256} name="search"/>
                </form>
            </div>

            <div class="window buffer">
                {games.map(game =>
                    <div class="card">
                        <div class="rating" aria-label="Rating" role="img">{roundStep(game.rating, 0.5)}</div>
                        <img is="x-image" reloadable class="image" src={`/content/${game.id}/cover-art`} loading="lazy" alt=""
                             aria-hidden="true"></img>
                        <div class="title">{wellFormed(game.title)}</div>
                        <div class="author">{wellFormed(game.author)}</div>
                        {game.description ? <div class="description">{wellFormed(game.description)}</div> : ''}
                        {game.playable ?
                            <a class="play" href={`/content/${game.id}/`}>Play</a> :
                            <a class="play">Play</a>
                        }
                    </div>
                )}
            </div>
        </main>
        </body>
        </html>);
}
