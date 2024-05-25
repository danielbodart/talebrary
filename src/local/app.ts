import {serve} from "bun";
import {applicationScope} from "../ApplicationScope.ts";
import {talebrary} from "./SqliteDatabase.ts";
import {localhostHandler} from "./FileHandler.ts";
import {FolderBucket} from "./buckets/FolderBucket.ts";
import {md5} from "./digest.ts";

const root = `${import.meta.dir}/../../www/`;
const r2 = new FolderBucket(root);
const app = applicationScope(talebrary(), localhostHandler(root), r2, md5);

const server = serve({
    async fetch(req) {
        return app.handler(req);
    },
});

console.log('Listening on', server.url.toString());