export interface HttpHandler {
    (request: Request): Promise<Response>;
}

export const client: HttpHandler = (request: Request): Promise<Response> => fetch(request);

export type HttpMethod = 'HEAD' | 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';

export type HttpHeader = [string, string];

export function request(method: HttpMethod, uri: string, headers: HttpHeader[]): Request {
    return new Request(uri, {method, headers});
}

export function get(uri: string, ...headers: HttpHeader[]): Request {
    return request('GET', uri, headers);
}

/**
 * Uri class based on {@link https://tools.ietf.org/html/rfc3986 RFC 3986}
 */
export class Uri {
    /** {@link https://tools.ietf.org/html/rfc3986#appendix-B } */
    static RFC_3986 = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/;
    scheme?: string;
    authority?: string;
    path: string;
    query?: string;
    fragment?: string;

    constructor(value: string) {
        const match = Uri.RFC_3986.exec(value);
        if (!match) throw new Error(`Invalid Uri: ${value}`);
        const [, , scheme, , authority, path, , query, , fragment] = match;
        this.scheme = scheme;
        this.authority = authority;
        this.path = path;
        this.query = query;
        this.fragment = fragment;
    }

    /** {@link https://tools.ietf.org/html/rfc3986#section-5.3} */
    toString() {
        const result: string[] = [];

        if (typeof this.scheme != 'undefined') result.push(this.scheme, ":");
        if (typeof this.authority != 'undefined') result.push("//", this.authority);
        result.push(this.path);
        if (typeof this.query != 'undefined') result.push("?", this.query);
        if (typeof this.fragment != 'undefined') result.push("#", this.fragment);
        return result.join('');
    }

    toJSON() {
        return this.toString();
    }
}