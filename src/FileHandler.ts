import {client, get, type HttpHandler, Uri} from "./http.ts";
import {file} from 'bun';

class MediaType {
    static WILDCARD = "*/*";
    static APPLICATION_XML = "application/xml";
    static APPLICATION_ATOM_XML = "application/atom+xml";
    static APPLICATION_XHTML_XML = "application/xhtml+xml";
    static APPLICATION_SVG_XML = "application/svg+xml";
    static APPLICATION_JAVASCRIPT = "application/javascript";
    static APPLICATION_JSON = "application/json";
    static APPLICATION_PDF = "application/pdf";
    static APPLICATION_FORM_URLENCODED = "application/x-www-form-urlencoded";
    static APPLICATION_OCTET_STREAM = "application/octet-stream";
    static APPLICATION_MS_EXCEL = "application/vnd.ms-excel";
    static MULTIPART_FORM_DATA = "multipart/form-data";
    static TEXT_PLAIN = "text/plain";
    static TEXT_CSV = "text/csv";
    static TEXT_XML = "text/xml";
    static TEXT_HTML = "text/html";
    static TEXT_CSS = "text/css";
    static TEXT_JAVASCRIPT = "text/javascript";
    static TEXT_CACHE_MANIFEST = "text/cache-manifest";
    static IMAGE_PNG = "image/png";
    static IMAGE_GIF = "image/gif";
    static IMAGE_X_ICON = "image/x-icon";
    static IMAGE_JPEG = "image/jpeg";
    static IMAGE_SVG = "image/svg+xml";
    static FONT_WOFF = "application/x-font-woff";
    static FONT_SFNT = " application/font-sfnt";
}

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