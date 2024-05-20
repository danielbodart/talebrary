import {applicationScope, type Env} from "./ApplicationScope.ts";
import {client} from "./http.ts";

export default {
    fetch(request: Request, env: Env) {
        const app = applicationScope(env.db, client, env.r2);
        return app.handler(request);
    },
}