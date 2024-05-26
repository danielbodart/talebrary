import {Uri} from "./http.ts";
import {D1GameFinder, type GameInfo} from "./D1GameFinder.ts";
import * as elements from 'typed-html';
import {parseHTML} from "linkedom";
import {Fragment} from "./templates/Fragment.tsx";

export class Librarian {
    constructor(private finder: D1GameFinder) {
    }

    async handle(request: Request): Promise<Response> {
        const uri = new Uri(request.url);
        const search = new URLSearchParams(uri.query).get('search');
        const result = await this.finder.find(search ?? '');
        // result.length = 10;
        return new Response(books(result), {status: 200, headers: {'Content-Type': 'text/html'}});
    }
}

function roundStep(value: number, step: number = 0.5): number {
    return Math.round(value / step) * step;
}

function wellFormed(unsafe: string | null | undefined): string {
    if (!unsafe) return ''
    const {document} = parseHTML(unsafe);
    return document.toString();
}

export function books(games: GameInfo[]): string {
    return <html lang="en">
    <head>
        <meta name="template" content="card"/>
        <title>Card</title>
    </head>
    <body>
    {games.map((game) =>
        <Fragment>
            <input class="orientation" type="checkbox" id={game.id}/>
            <label for={game.id} class="card" tabindex="0">
                <div class="rating">{roundStep(game.rating, 0.5)}</div>
                <img class="image" src={`/content/${game.id}/cover-art`} loading="lazy"></img>
                <div class="title">{wellFormed(game.title)}</div>
                <div class="author">{wellFormed(game.author)}</div>
                <div class="description">{wellFormed(game.description)}</div>
                {
                    // TODO Submit bug fix for typed-html
                    isPlayable(game.url) ?
                        <a class="play" href={`/content/${game.id}/`}>Play</a> :
                        <a class="play">Play</a>
                }

            </label>
        </Fragment>
    )}
    </body>
    </html>
}

export function extension(path: string): string | undefined {
    return path.split('.').pop()
}

const playable = new Set(['ulx', 'gblorb'])

export function isPlayable(url: string): boolean {
    const ext = extension(new Uri(url).path);
    return ext ? playable.has(ext) : false;
}