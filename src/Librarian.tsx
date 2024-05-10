import {Uri} from "./http.ts";
import {D1GameFinder, type GameInfo} from "./D1GameFinder.ts";
import * as elements from 'typed-html';

export class Librarian {
    constructor(private finder: D1GameFinder) {
    }

    async handle(request: Request): Promise<Response> {
        const uri = new Uri(request.url);
        const search = new URLSearchParams(uri.query).get('search');
        const result = await this.finder.find(search ?? '');
        return new Response(books(result))
    }
}

export function books(games: GameInfo[]): string {
    return <html>
    <head>

    </head>
    <body>
    <ul>
        {games.map((game) => <li>{game.name}</li>)}
    </ul>
    </body>
    </html>
}