import {applicationScope, type Env} from "./ApplicationScope.ts";
import {client} from "./http/mod.ts";
import {md5} from "./digest.ts";

export default {
    fetch(request: Request, env: Env) {
        // @ts-ignore
        const app = applicationScope(env.db, client, env.r2, md5, env.ai);
        return app.handler(request);
    },
}