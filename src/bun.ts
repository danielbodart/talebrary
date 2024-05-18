import {serve} from "bun";
import {applicationScope} from "./ApplicationScope.ts";
import {talebrary} from "./SqliteDatabase.ts";
import {localhostHandler} from "./FileHandler.ts";

const app = applicationScope(talebrary(), localhostHandler(`${import.meta.dir}/../www/`));

const server = serve({
    async fetch(req) {
        return app.handler(req);
    },
});

console.log('Listening on', server.url.toString());