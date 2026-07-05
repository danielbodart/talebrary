import type {GameFinder, GameInfo} from "../games/GameFinder.ts";
import {wellFormed, safeHtml} from "../templates/misc.ts";
import {html5} from "../templates/LinkedomHelpers.ts";
import {type GameQuery, type Room, resolveRoom} from "./CatalogueConfig.ts";
import {Uri} from "../http/Uri.ts";
import {parseAcceptLanguage} from "../http/AcceptLanguage.ts";
import {treeToNodes} from "../player/SuggestionNodes.ts";
import {buildSuggestionList} from "../player/SuggestionList.ts";
import {librarianResponse, librarianTopics} from "./Librarian.ts";
import type {Dependency} from "@bodar/yadic/types.ts";
import type {JSX2DOM, SupportedElement} from "@bodar/jsx2dom/JSX2DOM.ts";

export class CatalogueHandler {
    constructor(deps: Dependency<'finder', GameFinder>, private finder = deps.finder) {
    }

    async handle(request: Request): Promise<Response> {
        const uri = new Uri(request.url);
        const search = new URLSearchParams(uri.query).get('search') ?? undefined;
        const room = resolveRoom(uri.path, search);
        if (!room) return new Response('Not Found', {status: 404});

        const languages = parseAcceptLanguage(request.headers.get('accept-language'));
        const games = room.gameQuery ? await this.executeQuery(room.gameQuery, languages) : [];

        return new Response(render(room, search, games), {status: 200, headers: {'Content-Type': 'text/html'}});
    }

    private async executeQuery(query: GameQuery, languages: string[]): Promise<GameInfo[]> {
        switch (query.type) {
            case 'genre':
                return this.finder.findByGenre(query.genre!, languages);
            case 'top-rated':
                return this.finder.findTopRated(languages);
            case 'recent':
                return this.finder.findRecent(languages);
            case 'hand-picked':
                return this.finder.findByIds(query.ids!, languages);
            case 'search':
                return this.finder.find(query.search!, languages);
        }
    }
}

function navList(tree: Record<string, string[]>, jsx: JSX2DOM): SupportedElement {
    const el = buildSuggestionList(treeToNodes(tree), jsx);
    el.classList.add('nav');
    return el;
}

function render(room: Room, search: string | undefined, games: GameInfo[]): string {
    const illustrationUrl = `/cards/art?prompt=${encodeURIComponent(JSON.stringify({
        story: {title: 'The Talebrary Athenaeum', description: 'A vast library of interactive fiction games'},
        scene: room.illustration,
    }))}`;

    const topicMap = Object.fromEntries(librarianTopics.map(t => [t.id, t.response]));
    const tree: Record<string, string[]> = {
        go: room.exits.map(e => e.label),
        ask: [...librarianTopics.map(t => t.id), 'librarian'],
        look: [],
        inventory: [],
    };

    const librarianText = search ? librarianResponse(search, games) : undefined;

    return html5(jsx =>
        <html lang="en">
        <head>
            <title>{room.pageTitle}</title>
            <meta name="template" content="card"/>
            <link rel="stylesheet" href="/catalogue.css"/>
            <script src="/catalogue/main.js" type="module"></script>
        </head>
        <body>
        <main class="story catalogue">
            <div class="window grid">
                <div class="card">
                    <script type="application/json" class="librarian-topics">{JSON.stringify(topicMap)}</script>
                    <script type="application/ld+json" class="breadcrumb">{JSON.stringify({
                        '@type': 'BreadcrumbList',
                        itemListElement: room.breadcrumb.map((b, i) => ({
                            '@type': 'ListItem',
                            position: i + 1,
                            name: b.name,
                            ...(b.item ? {item: b.item} : {}),
                        })),
                    })}</script>
                </div>
            </div>

            <div class="card scene-card scroll">
                <img is="x-image" reloadable class="image" src={illustrationUrl} loading="eager" alt="" aria-hidden="true"></img>
                <div class="title">{room.title}</div>
                <div class="normal">{room.narrative}</div>
                <div class="exit-links hidden">
                    {room.exits.map(exit =>
                        <a href={exit.path}>go {exit.label}</a>
                    )}
                </div>
                {navList(tree, jsx)}
            </div>

            {librarianText ? <div class="card librarian-card">
                <div class="normal">{librarianText}</div>
            </div> : ''}

            <div class="card input-control">
                <form class="input">
                    <input type="text" maxlength={256} name="search" value={search ?? ''}/>
                </form>
            </div>

            {games.length > 0 ? <div class="window buffer">
                {games.map(game =>
                    <div class="card">
                        <img is="x-image" reloadable class="image" src={`/content/${game.id}/cover-art`} loading="lazy" alt=""
                             aria-hidden="true"></img>
                        <div class="title">{wellFormed(game.title)}</div>
                        <div class="author">{wellFormed(game.author)}</div>
                        {game.description ? <div class="description">{safeHtml(game.description)}</div> : ''}
                        <div class="play-bar">
                            {game.playable ?
                                <a class="play" href={`/content/${game.id}/`}>play</a> :
                                <a class="play">play</a>
                            }
                        </div>
                    </div>
                )}
            </div> : ''}
        </main>
        </body>
        </html>);
}
