import {file, Glob} from "bun";
import {readdir} from "node:fs/promises";

const RESULTS_DIR = "evals/results";
const UI_DIR = "evals/ui";
const CACHE_DIR = "evals/results/cache";
const PORT = 3001;

async function listRuns(): Promise<string[]> {
    try {
        const files = await readdir(RESULTS_DIR);
        return files.filter(f => f.endsWith(".json") && !f.startsWith(".")).sort().reverse();
    } catch {
        return [];
    }
}

async function readRun(name: string): Promise<any> {
    const path = `${RESULTS_DIR}/${name}`;
    const f = file(path);
    if (!await f.exists()) return null;
    return JSON.parse(await f.text());
}

async function saveHumanScore(body: any): Promise<boolean> {
    const {runFile, caseIndex, model, score} = body;
    const path = `${RESULTS_DIR}/${runFile}`;
    const f = file(path);
    if (!await f.exists()) return false;

    const run = JSON.parse(await f.text());
    if (!run.cases[caseIndex]) return false;

    if (!run.cases[caseIndex].humanScores) run.cases[caseIndex].humanScores = {};
    run.cases[caseIndex].humanScores[model] = score;

    await Bun.write(path, JSON.stringify(run, null, 2));
    return true;
}

async function findCachedImage(path: string): Promise<Uint8Array | null> {
    const f = file(`${CACHE_DIR}/${path}`);
    if (!await f.exists()) return null;
    return new Uint8Array(await f.arrayBuffer());
}

async function listCacheImages(): Promise<string[]> {
    const images: string[] = [];
    try {
        const glob = new Glob("**/*.{jpg,png,webp,bin}");
        for await (const path of glob.scan(CACHE_DIR)) {
            images.push(path);
        }
    } catch { /* empty cache */ }
    return images;
}

const server = Bun.serve({
    port: PORT,
    async fetch(req) {
        const url = new URL(req.url);
        const path = url.pathname;

        if (path === "/" || path === "/index.html") {
            return new Response(file(`${UI_DIR}/index.html`), {
                headers: {"content-type": "text/html"},
            });
        }

        if (path === "/main.js") {
            const built = await Bun.build({entrypoints: [`${UI_DIR}/main.ts`], target: "browser"});
            if (!built.success) return new Response("Build failed", {status: 500});
            return new Response(built.outputs[0], {
                headers: {"content-type": "application/javascript"},
            });
        }

        if (path === "/main.css") {
            return new Response(file(`${UI_DIR}/main.css`), {
                headers: {"content-type": "text/css"},
            });
        }

        if (path === "/api/runs") {
            return Response.json(await listRuns());
        }

        if (path.startsWith("/api/run/")) {
            const name = path.slice("/api/run/".length);
            const run = await readRun(name);
            if (!run) return new Response("Not found", {status: 404});
            return Response.json(run);
        }

        if (path.startsWith("/api/image/")) {
            const imgPath = path.slice("/api/image/".length);
            const bytes = await findCachedImage(imgPath);
            if (!bytes) return new Response("Not found", {status: 404});
            const ext = imgPath.split(".").pop();
            const mimeTypes: Record<string, string> = {jpg: "image/jpeg", png: "image/png", webp: "image/webp", bin: "application/octet-stream"};
            return new Response(bytes as unknown as BodyInit, {headers: {"content-type": mimeTypes[ext ?? ""] ?? "application/octet-stream"}});
        }

        if (path.startsWith("/api/cover/")) {
            const coverPath = path.slice("/api/cover/".length);
            const f = file(coverPath);
            if (!await f.exists()) return new Response("Not found", {status: 404});
            const ext = coverPath.split(".").pop();
            const mimeTypes: Record<string, string> = {jpg: "image/jpeg", png: "image/png", webp: "image/webp"};
            return new Response(f, {headers: {"content-type": mimeTypes[ext ?? ""] ?? "application/octet-stream"}});
        }

        if (path === "/api/images") {
            return Response.json(await listCacheImages());
        }

        if (path === "/api/score" && req.method === "POST") {
            const body = await req.json();
            const ok = await saveHumanScore(body);
            return ok ? Response.json({ok: true}) : new Response("Bad request", {status: 400});
        }

        return new Response("Not found", {status: 404});
    },
});

console.log(`Evals UI: http://localhost:${server.port}`);
