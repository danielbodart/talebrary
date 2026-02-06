import {serve} from "bun";
import {application} from "../Application.ts";
import {talebrary} from "./SqliteDatabase.ts";
import {localhostHandler} from "./FileHandler.ts";
import {FolderBucket} from "./buckets/FolderBucket.ts";
import {md5} from "./digest.ts";
import {DumbAi} from "./DumbAi.ts";
import {CloudflareRestAi} from "./CloudflareRestAi.ts";
import {client} from "../http/mod.ts";

const {CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN} = process.env;

function ai(): any {
    if (CLOUDFLARE_ACCOUNT_ID && CLOUDFLARE_API_TOKEN) {
        console.log('Using Cloudflare Workers AI via REST API');
        return new CloudflareRestAi(CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, client);
    }
    console.log('Using DumbAi stub');
    return new DumbAi();
}

const root = `${import.meta.dir}/../../www/`;
const r2 = new FolderBucket(root);
const deps = {
    http: localhostHandler(root),
    db: talebrary(),
    r2,
    digest: md5,
    ai: ai(),
};
const app = application(deps);
const handler = (req: Request) => app.handler(req);

const server = serve({
    fetch: handler,
});

console.log('Listening on', server.url.toString());
