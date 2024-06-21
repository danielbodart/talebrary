import type {Uri} from "./Uri.ts";

export interface HttpHandler {
    (request: Request): Promise<Response>;
}

export const client: HttpHandler = (request: Request): Promise<Response> => fetch(request);

export type HttpMethod = 'HEAD' | 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';

export type HttpHeader = [string, string];

export function request(method: HttpMethod, uri: string, headers: HttpHeader[]): Request {
    return new Request(uri, {method, headers});
}

export function get(uri: string | Uri, ...headers: HttpHeader[]): Request {
    return request('GET', uri.toString(), headers);
}

