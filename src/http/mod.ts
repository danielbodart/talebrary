import type {Uri} from "./Uri.ts";

export interface Http {
    (request: Request): Promise<Response>;
}

export interface HttpHandler {
    handle(request: Request): Promise<Response>;
}

export const client: Http = (request: Request): Promise<Response> => fetch(request);

export type HttpMethod = 'HEAD' | 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';

export type HttpHeader = [string, string];

export function request(method: HttpMethod, uri: string, headers: HttpHeader[]): Request {
    return new Request(uri, {method, headers});
}

export function get(uri: string | Uri, ...headers: HttpHeader[]): Request {
    return request('GET', uri.toString(), headers);
}

