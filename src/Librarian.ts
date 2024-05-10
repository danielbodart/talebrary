import {Uri} from "./http.ts";
import {D1GameFinder} from "./D1GameFinder.ts";

export class Librarian {
    constructor(private finder: D1GameFinder) {
    }

    async handle(request: Request): Promise<Response> {
        const uri = new Uri(request.url);
        const search = new URLSearchParams(uri.query).get('search');
        const result = await this.finder.find(search ?? '');
        return new Response(JSON.stringify(result))
    }
}