import {client, type Http} from "../http/mod.ts";
import {Uri} from "../http/Uri.ts";

export function withProxy(http: Http, proxyUrl: string, proxyToken: string, proxyHttp: Http = client): Http {
    return async (request: Request): Promise<Response> => {
        const {authority = ''} = new Uri(request.url);
        const [host] = authority.split(':');
        if (host.endsWith('ifarchive.org')) {
            const url = `${proxyUrl}/proxy?url=${encodeURIComponent(request.url)}`;
            return proxyHttp(new Request(url, {headers: {'Authorization': `Bearer ${proxyToken}`}}));
        }
        return http(request);
    };
}
