import {client} from "./http.ts";

export default {
    fetch(request: Request, env: any) {
        if (request.url === '/') {
            request.url = '/index.html';
        }
        return client(request);
    },
}