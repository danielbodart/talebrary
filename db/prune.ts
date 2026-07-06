// Diff prod game ids (passed in as JSON) against the latest local build and
// report games removed from IFDB. With --disable, writes prune.sql (soft-disable
// UPDATEs) for the caller to apply. Never hard-deletes: user data (e.g. a future
// favourites.game_id) referencing a game must never be broken by a refresh.
//
// Invoked by `./db/run prune [--disable]`, which supplies the prod JSON and
// applies prune.sql — wrangler runs there (bash), not here, to keep it on PATH.
//
//   bun run db/prune.ts <prod-games.json> [--disable]
import {Database} from "bun:sqlite";

const jsonPath = process.argv[2];
const disable = process.argv.includes("--disable");
const dbPath = process.env.DB_PATH ?? "db/talebrary.sqlite";

const local = new Database(dbPath, {readonly: true});
const localIds = new Set(
    (local.query("SELECT id FROM talebrary_games").all() as {id: string}[]).map(r => r.id));
local.close();

const raw = await Bun.file(jsonPath).text();
const prod = JSON.parse(raw.slice(raw.indexOf("[")))[0].results as {id: string; enabled: number}[];

const stale = prod.filter(r => !localIds.has(r.id));
const staleEnabled = stale.filter(r => r.enabled === 1);

console.log(`Prod games: ${prod.length}, local: ${localIds.size}`);
console.log(`Stale (in prod, gone from IFDB): ${stale.length} — ${staleEnabled.length} still enabled`);
for (const r of stale.slice(0, 25)) console.log(`  ${r.id}${r.enabled ? "" : " (already disabled)"}`);
if (stale.length > 25) console.log(`  … and ${stale.length - 25} more`);

if (!disable) {
    if (staleEnabled.length) console.log(`\nRe-run with --disable to soft-disable the ${staleEnabled.length} enabled stale games.`);
    process.exit(0);
}
if (!staleEnabled.length) { console.log("Nothing to disable."); process.exit(0); }

// Chunked IN-list UPDATEs, well under D1's 100KB/statement limit. Caller applies.
const ids = staleEnabled.map(r => r.id);
const chunks: string[][] = [];
for (let i = 0; i < ids.length; i += 200) chunks.push(ids.slice(i, i + 200));
const sql = chunks.map(c =>
    `UPDATE talebrary_games SET enabled=0 WHERE id IN (${c.map(id => "'" + id.replace(/'/g, "''") + "'").join(",")});`
).join("\n");
await Bun.write("prune.sql", sql);
console.log(`\nWrote prune.sql to soft-disable ${staleEnabled.length} games.`);
