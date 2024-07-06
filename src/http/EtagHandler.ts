import type {Http} from "./mod.ts";
import type {Digest} from "../system/digest.ts";

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


export function etagHandler(digest: Digest, http: Http) {
    return async (request: Request) => {
        const response = await http(request);
        if (request.method === 'GET' && response.ok && response.body) {
            const etag = response.headers.get('etag');
            const oldEtag = request.headers.get('if-none-match');
            if (etag && etag === oldEtag) {
                return new Response(null, {status: 304, headers: copySafeHeaders(response)});
            }

            const body = await response.arrayBuffer();
            const newEtag = strongEtag(await digest(body));
            if (newEtag === oldEtag) {
                return new Response(null, {status: 304, headers: copySafeHeaders(response)});
            }

            const newResponse = new Response(body, response)
            newResponse.headers.set('etag', newEtag)
            return newResponse;

        }
        return response;
    }
}

export function strongEtag(value: string): string {
    return `"${value}"`
}

