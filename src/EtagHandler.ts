import type {HttpHandler} from "./http.ts";

const safeHeaders = [
    'date',
    'last-modified',
    'cache-control',
    'expires',
    'set-cookie'
];

function copySafeHeaders(source: Response): Record<string, string> {
    return safeHeaders.reduce((a, header) => {
        const value = source.headers.get(header);
        if (value) a[header] = value;
        return a;
    }, {} as Record<string, string>);
}

export function etagHandler(http: HttpHandler) {
    return async (request: Request) => {
        const response = await http(request);
        const etag = response.headers.get('etag');
        if (!(request.method === 'GET' && response.ok && etag)) return response;

        if (etag === request.headers.get('if-none-match')) {
            return new Response(null, {status: 304, headers: copySafeHeaders(response)});
        }
        return response;
    }
}

