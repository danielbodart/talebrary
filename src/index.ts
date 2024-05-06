import {App} from "./App.ts";
import {client} from "./http.ts";

const app = new App(client);

export default {
    fetch(request: Request, env: any) {
        return app.handle(request);
    },
}