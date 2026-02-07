// @ts-ignore
import {DurableObject} from "cloudflare:workers";

export class IfArchiveProxy extends DurableObject<Env> {
    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const targetUrl = url.searchParams.get('url');
        if (!targetUrl) return new Response('Missing url param', {status: 400});

        const target = new URL(targetUrl);
        if (!target.hostname.endsWith('ifarchive.org')) {
            return new Response('Only ifarchive.org URLs allowed', {status: 403});
        }

        return fetch(targetUrl);
    }
}
