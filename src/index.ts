import {App} from "./App.ts";
import {client} from "./http.ts";
import {D1Database} from "@cloudflare/workers-types"
import {D1GameFinder} from "./D1GameFinder.ts";
import {Librarian} from "./Librarian.tsx";

interface Env {
    db: D1Database;
}

export default {
    fetch(request: Request, env: Env) {
        const app = new App(client, new Librarian(new D1GameFinder(env.db)));
        return app.handle(request);
    },
}