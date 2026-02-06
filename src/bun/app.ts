import {serve} from "bun";
import {application, DEFAULT_CONFIG} from "../Application.ts";
import {crossOriginIsolation} from "../http/CrossOriginIsolation.ts";
import {talebrary} from "./SqliteDatabase.ts";
import {localhostHandler} from "./FileHandler.ts";
import {FolderBucket} from "./buckets/FolderBucket.ts";
import {md5} from "./digest.ts";
import {DumbAi} from "./DumbAi.ts";

const root = `${import.meta.dir}/../../www/`;
const r2 = new FolderBucket(root);
const deps = {
    http: localhostHandler(root),
    db: talebrary(),
    r2,
    digest: md5,
    ai: new DumbAi() as any,
    HONEYCOMB_API_KEY: process.env.HONEYCOMB_API_KEY!,
    STABLE_DIFFUSION_API_KEY: process.env.STABLE_DIFFUSION_API_KEY!,
    ...DEFAULT_CONFIG
};
const app = application(deps);
const handler = crossOriginIsolation(req => app.handler(req));

const server = serve({
    fetch: handler,
});

console.log('Listening on', server.url.toString());