import {HttpHandler, Uri} from "./http.ts";
import { D1Database } from "npm:@cloudflare/workers-types";

export class App {
    constructor(private handler: HttpHandler, private db: D1Database) {
    }

    async handle(request: Request): Promise<Response> {
        const uri = new Uri(request.url);
        if (uri.path === '/env') {
            return new Response(JSON.stringify(this.db))
        }

        if (uri.path.endsWith('/')) {
            uri.path += 'index.html';
            return this.handler(new Request(uri.toString(), request));
        }
        return this.handler(request);
    }
}