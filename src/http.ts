export interface HttpHandler {
    (request: Request): Promise<Response>;
}

export const client: HttpHandler = function (request: Request): Promise<Response> {
    return fetch(request, {redirect: 'manual'});
}

export type HttpMethod =  'HEAD' | 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';

export type HttpHeader = [string, string];

export function request(method: HttpMethod, uri: string, headers: HttpHeader[]): Request {
    return new Request(uri, {method, headers});
}

export function get(uri: string, ...headers: HttpHeader[]): Request {
    return request('GET', uri, headers);
}