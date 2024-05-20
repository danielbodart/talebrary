import {serve} from "bun";
import {applicationScope} from "./ApplicationScope.ts";
import {talebrary} from "./SqliteDatabase.ts";
import {localhostHandler} from "./FileHandler.ts";
import type { R2Bucket } from "@cloudflare/workers-types";

const r2 = new Proxy<R2Bucket>({} as any, {});
const app = applicationScope(talebrary(), localhostHandler(`${import.meta.dir}/../www/`), r2);

const server = serve({
    async fetch(req) {
        return app.handler(req);
    },
});

console.log('Listening on', server.url.toString());