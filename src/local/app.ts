import {serve} from "bun";
import {applicationScope, DEFAULT_CONFIG} from "../ApplicationScope.ts";
import {talebrary} from "./SqliteDatabase.ts";
import {localhostHandler} from "./FileHandler.ts";
import {FolderBucket} from "./buckets/FolderBucket.ts";
import {md5} from "./digest.ts";

const root = `${import.meta.dir}/../../www/`;
const r2 = new FolderBucket(root);
const config = {HONEYCOMB_API_KEY: process.env.HONEYCOMB_API_KEY!, ...DEFAULT_CONFIG};
const app = applicationScope(localhostHandler(root), talebrary(), r2, md5, {} as any, config);

const server = serve({
    async fetch(req) {
        return app.handler(req);
    },
});

console.log('Listening on', server.url.toString());