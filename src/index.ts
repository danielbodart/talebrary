import {client} from "./http.ts";

export default {
    fetch(request: Request, env: any) {
        return client(request);
    }
}