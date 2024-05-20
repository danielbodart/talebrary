import {client, get, type HttpHandler, Uri} from "./http.ts";
import {file} from 'bun';
import {MediaType} from "./MediaType.ts";

const extensionToMimeType = new Map<string, string>([
        ["png", MediaType.IMAGE_PNG],
        ["gif", MediaType.IMAGE_GIF],
        ["jpg", MediaType.IMAGE_JPEG],
        ["jpeg", MediaType.IMAGE_JPEG],
        ["ico", MediaType.IMAGE_X_ICON],
        ["svg", MediaType.IMAGE_SVG],
        ["js", MediaType.TEXT_JAVASCRIPT],
        ["json", MediaType.APPLICATION_JSON],
        ["map", MediaType.APPLICATION_JAVASCRIPT],
        ["css", MediaType.TEXT_CSS],
        ["less", MediaType.TEXT_CSS],
        ["html", MediaType.TEXT_HTML],
        ["xml", MediaType.TEXT_XML],
        ["xsl", MediaType.TEXT_XML],
        ["csv", MediaType.TEXT_CSV],
        ["txt", MediaType.TEXT_PLAIN],
        ["appcache", MediaType.TEXT_CACHE_MANIFEST],
        ["otf", MediaType.FONT_SFNT],
        ["ttf", MediaType.FONT_SFNT],
        ["woff", MediaType.FONT_WOFF],
    ]
);

export function contentType(path: string): string {
    const [extension] = path.split('.').toReversed();
    return extensionToMimeType.get(extension) ?? MediaType.APPLICATION_OCTET_STREAM
}

export function fileHandler(): HttpHandler {
    return async (request: Request) => {
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
                    'content-type': contentType(path),
                    'content-length': data.size.toString()
                }
            })
        } catch (e: any) {
            return new Response(e.message, {status: 404})
        }
    };
}

export function localhostHandler(root: string): HttpHandler {
    const name = file(root).name;
    console.log('root', name);
    // TODO add support for canonical Uri and add check
    const files = fileHandler();
    return async request => {
        const {authority = '', path} = new Uri(request.url);
        const [host] = authority.split(':');
        if (host === 'localhost') {
            return files(get(`file://${name}${path}`))
        }
        return client(request)
    }
}