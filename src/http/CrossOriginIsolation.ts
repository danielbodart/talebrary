import type {Http} from "./mod.ts";

export function crossOriginIsolation(http: Http): Http {
    return async (request: Request) => {
        const response = await http(request);
        const headers = new Headers(response.headers);
        headers.set('Cross-Origin-Opener-Policy', 'same-origin');
        headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
        });
    }
}
