import {serve} from "bun";
import {application} from "../Application.ts";
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
};
const app = application(deps);
const handler = (req: Request) => app.handler(req);

const server = serve({
    fetch: handler,
});

console.log('Listening on', server.url.toString());
