import {HttpHandler, Uri} from "./http.ts";

export class App {
    constructor(private handler: HttpHandler, private env: any) {
    }

    async handle(request: Request): Promise<Response> {
        const uri = new Uri(request.url);
        if (uri.path === '/env') {
            return new Response(JSON.stringify(this.env))
        }

        if (uri.path.endsWith('/')) {
            uri.path += 'index.html';
            return this.handler(new Request(uri.toString(), request));
        }
        return this.handler(request);
    }
}