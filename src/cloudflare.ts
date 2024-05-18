import {applicationScope, type Env} from "./ApplicationScope.ts";
import {client} from "./http.ts";

export default {
    fetch(request: Request, env: Env) {
        const app = applicationScope(env.db, client);
        return app.handler(request);
    },
}