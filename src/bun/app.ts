import {serve} from "bun";
import {application, DEFAULT_CONFIG} from "../Application.ts";
import {talebrary} from "./SqliteDatabase.ts";
import {localhostHandler} from "./FileHandler.ts";
import {FolderBucket} from "./buckets/FolderBucket.ts";
import {md5} from "./digest.ts";
import {DumbAi} from "./DumbAi.ts";

const root = `${import.meta.dir}/../../www/`;
const r2 = new FolderBucket(root);
const config = {
    HONEYCOMB_API_KEY: process.env.HONEYCOMB_API_KEY!,
    STABLE_DIFFUSION_API_KEY: process.env.STABLE_DIFFUSION_API_KEY!,
    ...DEFAULT_CONFIG
};
const app = application(localhostHandler(root), talebrary(), r2, md5, new DumbAi() as any, config);

const server = serve({
    async fetch(req) {
        return app.handler(req);
    },
});

console.log('Listening on', server.url.toString());