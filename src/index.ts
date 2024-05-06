import {client} from "./http.ts";

export default {
    fetch(request: Request, env: any) {
        if (request.url === '/') {
            return client(new Request('/index.html', request));
        }
        return client(request);
    },
}