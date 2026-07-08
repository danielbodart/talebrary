import {serve} from "bun";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {application} from "../Application.ts";
import {talebrary} from "./SqliteDatabase.ts";
import {localhostHandler} from "./FileHandler.ts";
import {FolderBucket} from "./buckets/FolderBucket.ts";
import {md5} from "./digest.ts";
import {DumbAi} from "./DumbAi.ts";
import {CloudflareRestAi} from "./CloudflareRestAi.ts";
import {CloudflareAiAdapter} from "../ai/CloudflareAiAdapter.ts";
import {client} from "../http/mod.ts";
import {withProxy} from "./withProxy.ts";
import type {TalebraryAi} from "../ai/TalebraryAi.ts";
import {DirectRunner} from "../workflows/mod.ts";
import {coverArtWorkflow} from "../workflows/coverArt.ts";
import {illustrationWorkflow} from "../workflows/illustration.ts";
import {InMemoryAuth} from "../auth/InMemoryAuth.ts";

const {CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, PROXY_URL, PROXY_TOKEN} = process.env;

function ai(): TalebraryAi {
    if (CLOUDFLARE_ACCOUNT_ID && CLOUDFLARE_API_TOKEN) {
        console.log('Using Cloudflare Workers AI via REST API');
        return new CloudflareAiAdapter(new CloudflareRestAi(CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, client, "default"));
    }
    console.log('Using DumbAi stub');
    return new DumbAi();
}

const root = `${import.meta.dir}/../../www/`;
const bucket = new FolderBucket(root);

let http = localhostHandler(root);
if (PROXY_URL && PROXY_TOKEN) {
    console.log('Using IF Archive proxy via', PROXY_URL);
    http = withProxy(http, PROXY_URL, PROXY_TOKEN);
}

const aiInstance = ai();
// The Cloudflare root gets agt2agx as a bundled WebAssembly.Module (CompiledWasm);
// here we produce the same injected result differently — locate the wasm via the
// wasiglk package export (no node_modules path juggling) and compile it. Bun's
// own *.wasm import only yields a path, and runtime compile is fine off-worker.
const agtWasm = new URL("../wasm/agt2agx.wasm", import.meta.resolve("@bodar/wasiglk"));
const agtModule = new WebAssembly.Module(readFileSync(fileURLToPath(agtWasm)));
const deps = {
    http,
    db: talebrary(),
    bucket,
    digest: md5,
    ai: aiInstance,
    auth: new InMemoryAuth(),
    // Pipelines is Cloudflare-only; locally just log transcript batches so the
    // /events → capture path is verifiable in dev.
    eventSender: {send: async (e: any) => { if (e?.stanzas) console.log('[events] transcript stanzas:', e.stanzas.length); }},
    coverArtRunner: new DirectRunner(coverArtWorkflow({http, ai: aiInstance, bucket})),
    illustrationRunner: new DirectRunner(illustrationWorkflow({ai: aiInstance, bucket})),
    agtModule,
};
const app = application(deps);
const handler = (req: Request) => app.handler(req);

const server = serve({
    fetch: handler,
});

console.log('Listening on', server.url.toString());
