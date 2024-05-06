import {client, Uri} from "./http.ts";

export default {
    fetch(request: Request, env: any) {
        const uri = new Uri(request.url);
        if (uri.path.endsWith('/')) {
            uri.path += '/index.html';
            return client(new Request(uri.toString(), request));
        }
        return client(request);
    },
}