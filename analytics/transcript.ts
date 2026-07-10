#!/usr/bin/env bun
/**
 * Reconstruct a readable playthrough from the R2 `talebrary.transcripts` table
 * by parsing the raw `output` GlkOte JSON into clean prose.
 *
 *   bun analytics/transcript.ts <game_id>                 # longest session
 *   bun analytics/transcript.ts <game_id> --session <id>  # a specific session
 *   bun analytics/transcript.ts <game_id> --limit 20      # first 20 stanzas
 *   bun analytics/transcript.ts <game_id> --input         # include player input echoes
 *
 * Why parse `output` and not the `output_text` column? `output_text` is
 * pre-extracted but contains newlines, so it can't be recovered from r2sql's
 * box-table output. The `output` JSON is single-line, so it parses cleanly —
 * and this reuses the exact extraction the ingest pipeline uses
 * (CloudflarePipelineAdapter.extractOutputText), so results match the column.
 *
 * Data is fetched via ./analytics/r2sql, which handles the warehouse + auth.
 */
import {$} from "bun";

const [, , gameId, ...rest] = process.argv;
if (!gameId) {
  console.error("usage: bun analytics/transcript.ts <game_id> [--session <id>] [--limit <n>] [--input]");
  process.exit(1);
}
const opt = (flag: string) => {
  const i = rest.indexOf(flag);
  return i >= 0 ? rest[i + 1] : undefined;
};
const withInput = rest.includes("--input");
const limit = opt("--limit");
let session = opt("--session");

const R2SQL = `${import.meta.dir}/r2sql`;
const esc = (s: string) => s.replace(/'/g, "''"); // escape single quotes in SQL literals
const sql = (query: string) => $`${R2SQL} ${query}`.text();

/** Pull the JSON-object cells out of r2sql's box-table output (one per row). */
const jsonCells = (table: string) => [...table.matchAll(/\{".*\}/g)].map(m => m[0]);

/** Mirror of the ingest pipeline's extractOutputText (buffer text + grid lines). */
function extractText(output: any): string {
  const lines: string[] = [];
  for (const win of output?.content ?? []) {
    for (const para of win?.text ?? []) lines.push(spanText(para?.content, win));
    for (const gridLine of win?.lines ?? []) lines.push(spanText(gridLine?.content, win));
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
function spanText(spans: any, _win: any): string {
  if (!Array.isArray(spans)) return "";
  return spans
    .filter(s => withInput || !(s && s.style === "input"))
    .map(s => (typeof s === "string" ? s : s?.text ?? ""))
    .join("");
}

// Auto-pick the richest session (most stanzas) when none is given.
if (!session) {
  const table = await sql(
    `SELECT session_id, COUNT(*) n FROM talebrary.transcripts ` +
    `WHERE game_id = '${esc(gameId)}' GROUP BY session_id ORDER BY n DESC LIMIT 1`,
  );
  // First non-header cell in a row that ends with a count.
  session = table.match(/│\s*(\S+)\s*│\s*\d+\s*│/)?.[1];
  if (!session) {
    console.error(`No sessions found for game_id '${gameId}'.`);
    process.exit(1);
  }
  console.error(`# session ${session} (auto-picked: most stanzas)`);
}

const query =
  `SELECT seq, output FROM talebrary.transcripts ` +
  `WHERE game_id = '${esc(gameId)}' AND session_id = '${esc(session)}' ` +
  `ORDER BY seq ASC${limit ? ` LIMIT ${Number(limit)}` : ""}`;

for (const cell of jsonCells(await sql(query))) {
  let out: any;
  try { out = JSON.parse(cell); } catch { continue; }
  const text = extractText(out);
  if (text) console.log(text + "\n");
}
