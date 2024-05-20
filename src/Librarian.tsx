import {Uri} from "./http.ts";
import {D1GameFinder, type GameInfo} from "./D1GameFinder.ts";
import * as elements from 'typed-html';
import {parseHTML} from "linkedom";

export class Librarian {
    constructor(private finder: D1GameFinder) {
    }

    async handle(request: Request): Promise<Response> {
        const uri = new Uri(request.url);
        const search = new URLSearchParams(uri.query).get('search');
        const result = await this.finder.find(search ?? '');
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
        <div id={game.id} class="card">
            <div class="rating">{roundStep(game.rating, 0.5)}</div>
            <div class="image" style={`background-image: url('${game.coverart}')`}></div>
            <div class="title">{wellFormed(game.title)}</div>
            <div class="description">{wellFormed(game.description)}</div>
        </div>
    )}
    </body>
    </html>
}
