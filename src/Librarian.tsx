import {Uri} from "./http.ts";
import {D1GameFinder, type GameInfo} from "./D1GameFinder.ts";
import * as elements from 'typed-html';
import {Fragment} from "./templates/Fragment.tsx";
import {roundStep, wellFormed} from "./misc.ts";

export class Librarian {
    constructor(private finder: D1GameFinder) {
    }

    async handle(request: Request): Promise<Response> {
        const uri = new Uri(request.url);
        const search = new URLSearchParams(uri.query).get('search') ?? '';
        const games = await this.finder.find(search);
        return new Response(render(search, games), {status: 200, headers: {'Content-Type': 'text/html'}});
    }
}

export function render(search: string, games: GameInfo[]): string {
    return <html lang="en">
    <head>
        <meta name="template" content="card"/>
        <title>Card</title>
    </head>
    <body class="search">
    <div class="window grid">
        <div class="card input-control">
            <form class="input">
                <input name="search" type="text" maxlength="256" value={search}/>
            </form>
        </div>
    </div>
    <div class="window buffer">
        {games.map((game) =>
            <Fragment>
                <input class="orientation" type="checkbox" id={game.id}/>
                <label for={game.id} class="card" tabindex="0">
                    <div class="rating">{roundStep(game.rating, 0.5)}</div>
                    <img class="image" src={`/content/${game.id}/cover-art`} loading="lazy"></img>
                    <div class="title">{wellFormed(game.title)}</div>
                    <div class="author">{wellFormed(game.author)}</div>
                    {game.description ? <div class="description">{wellFormed(game.description)}</div> : ''}
                    {
                        // TODO Submit bug fix for typed-html to handle undefined attributes (should ignore)
                        game.playable ?
                            <a class="play" href={`/content/${game.id}/`}>Play</a> :
                            <a class="play">Play</a>
                    }

                </label>
            </Fragment>
        )}
    </div>
    </body>
    </html>
}
