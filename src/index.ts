import {App} from "./App.ts";
import {client} from "./http.ts";

export default {
    fetch(request: Request, env: any) {
        const app = new App(client, env);
        return app.handle(request);
    },
}