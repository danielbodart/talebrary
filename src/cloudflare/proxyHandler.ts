import {type Http} from "../http/mod.ts";

export async function proxyHandler(request: Request, token: string, http: Http): Promise<Response> {
    const auth = request.headers.get('Authorization');
    if (auth !== `Bearer ${token}`) return new Response('Unauthorized', {status: 401});

    const url = new URL(request.url).searchParams.get('url');
    if (!url) return new Response('Missing url param', {status: 400});

    try {
        const target = new URL(url);
        if (!target.hostname.endsWith('ifarchive.org')) {
            return new Response('Only ifarchive.org URLs allowed', {status: 403});
        }
    } catch {
        return new Response('Invalid url param', {status: 400});
    }

    return http(new Request(url));
}
