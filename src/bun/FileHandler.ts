import {client, get, type HttpHandler} from "../http/mod.ts";
import {file} from 'bun';
import {Uri} from "../http/Uri.ts";


export async function fileHandler(request: Request) {
    try {
        if (request.method !== 'GET') return new Response('Method Not Allowed', {status: 405});
        const {scheme, path} = new Uri(request.url);
        if (scheme !== 'file') return new Response('Not found', {status: 404});
        const data = file(path);
        if (!(await data.exists())) return new Response('Not found', {status: 404});
        return new Response(data.stream(), {
            status: 200,
            headers: {
                'last-modified': new Date(data.lastModified).toISOString(),
                'content-type': data.type,
                'content-length': data.size.toString()
            }
        })
    } catch (e: any) {
        return new Response(e.message, {status: 404})
    }
}

export function localhostHandler(root: string): HttpHandler {
    const name = file(root).name;
    console.log('root', name);
    // TODO add support for canonical Uri and add check
    return async request => {
        const {authority = '', path} = new Uri(request.url);
        const [host] = authority.split(':');
        if (host === 'localhost') {
            return fileHandler(get(`file://${name}${path}`))
        }
        return client(request)
    }
}